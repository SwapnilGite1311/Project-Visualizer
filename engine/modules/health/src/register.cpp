#include <chrono>
#include <mutex>
#include <unordered_map>

#include "pv/core/error.hpp"
#include "pv/health/health.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

namespace {

using pv::rpc::Json;
constexpr int64_t kThrottleMs = 500;

int64_t now_ms() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();
}

// Re-evaluates the project's health, writes changed states into the graph and reports the changes.
void refresh(pv::session::Registry& reg, const std::string& project_id, int64_t now) {
    std::shared_ptr<pv::session::Project> project;
    try {
        project = reg.projects.get(project_id);
    } catch (const pv::core::PvError&) {
        return;
    }
    const auto states = project->read([&](const pv::graph::Graph& g) { return pv::health::tracker().evaluate(project_id, g, now); });
    Json changes = Json::array();
    project->write([&](pv::graph::Graph& g) {
        for (const pv::core::Node* n : g.all_nodes()) {
            const auto it = states.find(n->id);
            const pv::core::Health next = it == states.end() ? pv::core::Health::Unknown : it->second.state;
            if (next == n->health) continue;
            changes.push_back({{"node_id", n->id}, {"from", pv::core::to_string(n->health)}, {"to", pv::core::to_string(next)}});
            g.find_node_mut(n->id)->health = next;
        }
        return 0;
    });
    if (!changes.empty()) reg.notifier.notify("health.changed", Json{{"project_id", project_id}, {"changes", changes}});
}

int int_threshold(const Json& in, const char* key, int current, int min) {
    if (!in.contains(key)) return current;
    if (!in[key].is_number_integer() || in[key].get<int64_t>() < min) {
        throw pv::core::PvError(pv::core::err::InvalidParams, std::string("invalid threshold: ") + key);
    }
    return in[key].get<int>();
}

}  // namespace

void pv_register_health(pv::session::Registry& reg) {
    auto last_refresh = std::make_shared<std::pair<std::mutex, std::unordered_map<std::string, int64_t>>>();

    pv::runtime::hub().add_listener([&reg, last_refresh](const std::string& project_id, const std::vector<pv::runtime::MappedEvent>& batch) {
        const int64_t now = now_ms();
        pv::health::tracker().on_events(project_id, batch, now);
        {
            std::lock_guard lock(last_refresh->first);
            int64_t& last = last_refresh->second[project_id];
            if (last != 0 && now - last < kThrottleMs) return;
            last = now;
        }
        refresh(reg, project_id, now);
    });

    reg.methods.add("health.get", [&reg](const Json& p) {
        const auto project = reg.projects.get_ready(pv::rpc::require_string(p, "project_id"));
        const auto wanted = pv::rpc::optional_string_list(p, "node_ids");
        const auto states =
            project->read([&](const pv::graph::Graph& g) { return pv::health::tracker().evaluate(project->id(), g, now_ms()); });
        Json out = Json::object();
        if (wanted.empty()) {
            for (const auto& [id, info] : states) {
                if (info.state != pv::core::Health::Unknown) out[id] = pv::health::to_json(info);
            }
        } else {
            for (const std::string& id : wanted) {
                const auto it = states.find(id);
                out[id] = pv::health::to_json(it == states.end() ? pv::health::HealthInfo{} : it->second);
            }
        }
        return Json{{"states", out}};
    });

    reg.methods.add("health.config", [&reg](const Json& p) {
        const std::string pid = pv::rpc::require_string(p, "project_id");
        reg.projects.get(pid);
        pv::health::Thresholds t = pv::health::tracker().thresholds(pid);
        if (p.contains("thresholds") && p["thresholds"].is_object()) {
            const Json& in = p["thresholds"];
            t.window_ms = int_threshold(in, "window_ms", t.window_ms, 1);
            t.warn_p95_ms = int_threshold(in, "warn_p95_ms", t.warn_p95_ms, 0);
            t.stall_ms = int_threshold(in, "stall_ms", t.stall_ms, 1);
            t.loop_calls = int_threshold(in, "loop_calls", t.loop_calls, 1);
            if (in.contains("error_rate")) {
                if (!in["error_rate"].is_number() || in["error_rate"].get<double>() < 0 || in["error_rate"].get<double>() > 1) {
                    throw pv::core::PvError(pv::core::err::InvalidParams, "invalid threshold: error_rate");
                }
                t.error_rate = in["error_rate"].get<double>();
            }
            pv::health::tracker().set_thresholds(pid, t);
        }
        return Json{{"thresholds",
                     {{"window_ms", t.window_ms}, {"error_rate", t.error_rate}, {"warn_p95_ms", t.warn_p95_ms}, {"stall_ms", t.stall_ms}, {"loop_calls", t.loop_calls}}}};
    });
}
