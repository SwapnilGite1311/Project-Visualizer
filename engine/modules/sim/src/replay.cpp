#include "pv/sim/replay.hpp"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <functional>
#include <map>
#include <set>
#include <unordered_map>

#include "pv/impact/impact.hpp"

namespace pv::sim {

namespace detail {

namespace {

uint64_t fnv1a(const std::string& s) {
    uint64_t h = 14695981039346656037ULL;
    for (const unsigned char c : s) {
        h ^= c;
        h *= 1099511628211ULL;
    }
    return h;
}

// Why a step would fail in the sandbox (independent of whether it failed for real).
bool fails_in_sandbox(const Sandbox& sb, const graph::Graph& g, const runtime::MappedEvent& m, const std::string& parent_node) {
    const std::string& n = m.node_id;
    if (n.empty()) return false;
    const std::vector<std::string> own = g.ancestors(n);
    for (const std::string& a : own) {
        if (sb.deleted_nodes.count(a)) return true;
    }
    if (!parent_node.empty() && !sb.removed_edges.empty()) {
        // The call crosses a removed edge between these nodes or any of their containers (e.g. module to module).
        for (const std::string& from : g.ancestors(parent_node)) {
            for (const std::string& to : own) {
                if (sb.removed_edges.count(from + "|" + to)) return true;
            }
        }
    }
    const auto rate = sb.error_rate.find(n);
    if (rate != sb.error_rate.end() && rate->second > 0) {
        const std::string key = m.ev.event_id.empty() ? m.ev.trace_id + "/" + m.ev.span_id : m.ev.event_id;
        if (static_cast<double>(fnv1a(key) % 10000) / 10000.0 < rate->second) return true;  // deterministic
    }
    return false;
}

}  // namespace

std::vector<ReplayedTrace> replay(const Sandbox& sb, const graph::Graph& g, const std::vector<runtime::MappedEvent>& events, int limit) {
    // Group spans by trace; order traces by their newest event.
    std::map<std::string, std::vector<const runtime::MappedEvent*>> by_trace;
    std::map<std::string, int64_t> newest;
    for (const auto& m : events) {
        if (m.ev.trace_id.empty() || m.ev.kind == "stall") continue;
        by_trace[m.ev.trace_id].push_back(&m);
        newest[m.ev.trace_id] = std::max(newest[m.ev.trace_id], m.ev.start_ns);
    }
    std::vector<std::pair<int64_t, std::string>> order;
    for (const auto& [id, t] : newest) order.emplace_back(t, id);
    std::sort(order.begin(), order.end(), [](const auto& a, const auto& b) { return a.first != b.first ? a.first > b.first : a.second < b.second; });
    if (static_cast<int>(order.size()) > limit) order.resize(static_cast<std::size_t>(std::max(limit, 0)));

    std::vector<ReplayedTrace> out;
    for (const auto& [t, id] : order) {
        ReplayedTrace tr;
        tr.trace_id = id;
        const auto& spans = by_trace[id];
        std::unordered_map<std::string, int> index;
        for (const auto* m : spans) {
            Step s;
            s.ev = m;
            s.real_failed = runtime::is_error_event(m->ev);
            s.real_ms = static_cast<double>(m->ev.duration_ns) / 1e6;
            index[m->ev.span_id] = static_cast<int>(tr.steps.size());
            tr.steps.push_back(s);
        }
        std::vector<std::vector<int>> children(tr.steps.size());
        for (std::size_t i = 0; i < tr.steps.size(); ++i) {
            const auto p = index.find(tr.steps[i].ev->ev.parent_span_id);
            if (p != index.end() && p->second != static_cast<int>(i)) {
                tr.steps[i].parent = p->second;
                children[static_cast<std::size_t>(p->second)].push_back(static_cast<int>(i));
            }
        }
        // New failures of the sandbox, then carried up to every caller span of the trace.
        for (auto& s : tr.steps) {
            const std::string parent_node = s.parent >= 0 ? tr.steps[static_cast<std::size_t>(s.parent)].ev->node_id : s.ev->parent_node_id;
            s.sim_failed = s.real_failed || fails_in_sandbox(sb, g, *s.ev, parent_node);
        }
        for (std::size_t i = 0; i < tr.steps.size(); ++i) {
            if (!tr.steps[i].sim_failed || tr.steps[i].real_failed) continue;
            int p = tr.steps[i].parent;
            std::set<int> seen;
            while (p >= 0 && seen.insert(p).second) {
                tr.steps[static_cast<std::size_t>(p)].sim_failed = true;
                p = tr.steps[static_cast<std::size_t>(p)].parent;
            }
        }
        // Simulated time: own time × latency factor, plus the extra time of the steps below (callers wait for callees).
        std::vector<int> state(tr.steps.size(), 0);
        std::function<double(int)> sim_total = [&](int i) -> double {
            Step& s = tr.steps[static_cast<std::size_t>(i)];
            if (state[static_cast<std::size_t>(i)] == 2) return s.sim_ms;
            if (state[static_cast<std::size_t>(i)] == 1) return s.real_ms;  // a cycle in bad data: stop here
            state[static_cast<std::size_t>(i)] = 1;
            const auto f = sb.latency_factor.find(s.ev->node_id);
            double total = s.real_ms * (f == sb.latency_factor.end() ? 1.0 : f->second);
            for (const int c : children[static_cast<std::size_t>(i)]) {
                total += sim_total(c) - tr.steps[static_cast<std::size_t>(c)].real_ms;
            }
            s.sim_ms = std::max(0.0, total);
            state[static_cast<std::size_t>(i)] = 2;
            return s.sim_ms;
        };
        for (std::size_t i = 0; i < tr.steps.size(); ++i) {
            const double sim = sim_total(static_cast<int>(i));
            if (tr.steps[i].parent < 0) {
                tr.real_ms = std::max(tr.real_ms, tr.steps[i].real_ms);
                tr.sim_ms = std::max(tr.sim_ms, sim);
            }
            tr.real_failed = tr.real_failed || tr.steps[i].real_failed;
            tr.sim_failed = tr.sim_failed || tr.steps[i].sim_failed;
        }
        out.push_back(std::move(tr));
    }
    return out;
}

}  // namespace detail

namespace {

double p95(std::vector<double> v) {
    if (v.empty()) return 0;
    std::sort(v.begin(), v.end());
    const auto idx = static_cast<std::size_t>(std::ceil(0.95 * static_cast<double>(v.size()))) - 1;
    return v[std::min(idx, v.size() - 1)];
}

}  // namespace

nlohmann::json run_replay(const Sandbox& sb, const graph::Graph& g, const std::vector<runtime::MappedEvent>& events, int trace_limit) {
    const auto traces = detail::replay(sb, g, events, trace_limit);
    struct Effect {
        int calls = 0, failures_real = 0, failures_sim = 0;
        std::vector<double> real, sim;
    };
    std::map<std::string, Effect> effects;
    std::vector<double> real_times, sim_times;
    int failed_real = 0, failed_sim = 0;
    nlohmann::json failed_ids = nlohmann::json::array();
    for (const auto& tr : traces) {
        real_times.push_back(tr.real_ms);
        sim_times.push_back(tr.sim_ms);
        failed_real += tr.real_failed ? 1 : 0;
        if (tr.sim_failed) {
            ++failed_sim;
            if (failed_ids.size() < 100) failed_ids.push_back(tr.trace_id);
        }
        for (const auto& s : tr.steps) {
            if (s.ev->node_id.empty()) continue;
            Effect& e = effects[s.ev->node_id];
            ++e.calls;
            e.failures_real += s.real_failed ? 1 : 0;
            e.failures_sim += s.sim_failed ? 1 : 0;
            e.real.push_back(s.real_ms);
            e.sim.push_back(s.sim_ms);
        }
    }
    nlohmann::json node_effects = nlohmann::json::array();
    nlohmann::json broken = nlohmann::json::array();
    for (auto& [id, e] : effects) {
        node_effects.push_back({{"node_id", id},
                                {"calls", e.calls},
                                {"failures_real", e.failures_real},
                                {"failures_sim", e.failures_sim},
                                {"p95_real_ms", p95(e.real)},
                                {"p95_sim_ms", p95(e.sim)}});
        if (e.failures_sim > e.failures_real) broken.push_back(id);
    }
    return {{"mode", "replay"},
            {"traces_total", static_cast<int>(traces.size())},
            {"traces_failed_real", failed_real},
            {"traces_failed_sim", failed_sim},
            {"latency_p95_real_ms", p95(real_times)},
            {"latency_p95_sim_ms", p95(sim_times)},
            {"node_effects", node_effects},
            {"failed_trace_ids", failed_ids},
            {"broken_node_ids", broken}};
}

nlohmann::json run_static(const Sandbox& sb, const graph::Graph& g) {
    std::set<std::string> broken;
    auto add_impact = [&](const std::string& id) {
        if (!g.find_node(id)) return;
        for (const auto& a : impact::analyze_impact(g, id, 5).affected) {
            if (!sb.deleted_nodes.count(a.node_id)) broken.insert(a.node_id);
        }
    };
    for (const auto& c : sb.changes) {
        if (c.kind == "delete_node" || c.kind == "rename" || c.kind == "move") add_impact(c.node_id);
        if (c.kind == "remove_edge") {
            if (sb.removed_edges.count(c.source_id + "|" + c.target_id)) broken.insert(c.source_id);
        }
    }
    return {{"mode", "static"},
            {"traces_total", 0},
            {"traces_failed_real", 0},
            {"traces_failed_sim", 0},
            {"latency_p95_real_ms", 0.0},
            {"latency_p95_sim_ms", 0.0},
            {"node_effects", nlohmann::json::array()},
            {"failed_trace_ids", nlohmann::json::array()},
            {"broken_node_ids", std::vector<std::string>(broken.begin(), broken.end())}};
}

}  // namespace pv::sim
