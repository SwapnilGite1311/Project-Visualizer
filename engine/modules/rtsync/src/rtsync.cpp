#include "pv/rtsync/rtsync.hpp"

#include <algorithm>
#include <cmath>
#include <set>
#include <unordered_map>

#include "pv/core/json.hpp"
#include "pv/graph/level_view.hpp"

namespace pv::rtsync {

nlohmann::json live_level_view(const graph::Graph& g, const std::string& parent_id, const std::vector<runtime::MappedEvent>& events,
                               const std::map<std::string, health::HealthInfo>& health, int64_t window_ns) {
    const graph::LevelView view = graph::build_level_view(g, parent_id);
    std::set<std::string> shown;
    for (const core::Node& n : view.nodes) shown.insert(n.id);
    std::set<std::string> edge_ids;
    for (const core::Edge& e : view.edges) edge_ids.insert(e.id);

    // The element of this level that is the node itself or contains it; "" when the node is elsewhere.
    std::unordered_map<std::string, std::string> display_cache;
    auto display_of = [&](const std::string& id) -> std::string {
        if (id.empty() || !g.find_node(id)) return "";
        const auto cached = display_cache.find(id);
        if (cached != display_cache.end()) return cached->second;
        std::string found;
        for (const std::string& a : g.ancestors(id)) {
            if (shown.count(a)) found = a;
        }
        display_cache[id] = found;
        return found;
    };

    int64_t now_ns = 0;
    for (const auto& m : events) now_ns = std::max(now_ns, m.ev.start_ns);
    const int64_t since = now_ns - window_ns;

    struct Live {
        int calls = 0, errors = 0, stalls = 0;
        std::vector<int64_t> durations;
    };
    std::map<std::string, Live> live;
    std::map<std::pair<std::string, std::string>, int> flows;
    for (const auto& m : events) {
        if (m.ev.start_ns < since) continue;
        const std::string d = display_of(m.node_id);
        if (d.empty()) continue;
        Live& l = live[d];
        ++l.calls;
        if (runtime::is_error_event(m.ev)) ++l.errors;
        if (m.ev.kind == "stall") ++l.stalls;
        l.durations.push_back(m.ev.duration_ns);
        const std::string from = display_of(m.parent_node_id);
        if (!from.empty() && from != d) ++flows[{from, d}];
    }

    nlohmann::json live_json = nlohmann::json::object();
    for (auto& [id, l] : live) {
        std::sort(l.durations.begin(), l.durations.end());
        const auto index = static_cast<std::size_t>(std::ceil(0.95 * static_cast<double>(l.durations.size()))) - 1;
        const auto h = health.find(id);
        live_json[id] = {{"calls", l.calls},
                         {"errors", l.errors},
                         {"stalls", l.stalls},
                         {"p95_ms", static_cast<double>(l.durations[index]) / 1e6},
                         {"health", core::to_string(h == health.end() ? core::Health::Unknown : h->second.state)}};
    }
    nlohmann::json flows_json = nlohmann::json::array();
    for (const auto& [key, count] : flows) {
        const std::string edge = "agg|calls|" + key.first + "|" + key.second;
        flows_json.push_back({{"source_id", key.first}, {"target_id", key.second}, {"count", count}, {"edge_id", edge_ids.count(edge) ? edge : ""}});
    }
    nlohmann::json nodes = nlohmann::json::array();
    for (const core::Node& n : view.nodes) nodes.push_back(n);
    nlohmann::json edges = nlohmann::json::array();
    for (const core::Edge& e : view.edges) edges.push_back(e);
    return {{"parent", view.parent}, {"nodes", nodes}, {"edges", edges}, {"live", live_json}, {"flows", flows_json}};
}

}  // namespace pv::rtsync
