#include <algorithm>
#include <map>

#include "pv/modtrace/modtrace.hpp"

namespace pv::modtrace {

std::string module_of(const graph::Graph& g, const std::string& node_id) {
    if (node_id.empty() || !g.find_node(node_id)) return "";
    const std::string id = g.ancestor_at_level(node_id, 2);
    const core::Node* n = id.empty() ? nullptr : g.find_node(id);
    return n && n->kind == core::NodeKind::Module ? id : "";
}

std::vector<Crossing> boundaries(const graph::Graph& g, const std::vector<runtime::MappedEvent>& events, int64_t since_ns,
                                 int loop_threshold) {
    struct Acc {
        Crossing c;
        int64_t total_ns = 0;
        std::map<std::string, int> per_trace;
    };
    std::map<std::pair<std::string, std::string>, Acc> acc;
    for (const runtime::MappedEvent& m : events) {
        if (m.ev.start_ns < since_ns || m.node_id.empty() || m.parent_node_id.empty()) continue;
        const std::string a = module_of(g, m.parent_node_id);
        const std::string b = module_of(g, m.node_id);
        if (a.empty() || b.empty() || a == b) continue;
        Acc& x = acc[{a, b}];
        x.c.from_id = a;
        x.c.to_id = b;
        ++x.c.count;
        x.total_ns += m.ev.duration_ns;
        if (runtime::is_error_event(m.ev)) ++x.c.errors;
        if (m.ev.kind == "stall") ++x.c.stalls;
        ++x.per_trace[m.ev.trace_id];
    }
    std::vector<Crossing> out;
    for (auto& [key, x] : acc) {
        x.c.avg_ms = static_cast<double>(x.total_ns) / x.c.count / 1e6;
        x.c.loops = static_cast<int>(std::count_if(x.per_trace.begin(), x.per_trace.end(), [&](const auto& p) { return p.second > loop_threshold; }));
        out.push_back(x.c);
    }
    std::sort(out.begin(), out.end(), [](const Crossing& a, const Crossing& b) {
        if (a.count != b.count) return a.count > b.count;
        if (a.from_id != b.from_id) return a.from_id < b.from_id;
        return a.to_id < b.to_id;
    });
    return out;
}

}  // namespace pv::modtrace
