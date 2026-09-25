#include <algorithm>
#include <map>
#include <optional>

#include "pv/core/error.hpp"
#include "pv/modtrace/modtrace.hpp"

namespace pv::modtrace {

std::vector<Hop> follow(const graph::Graph& g, const std::vector<runtime::MappedEvent>& events, const std::string& trace_id,
                        const std::string& direction, const std::string& from_node_id) {
    if (direction != "forward" && direction != "backward") {
        throw core::PvError(core::err::InvalidParams, "direction must be forward or backward");
    }
    std::vector<const runtime::MappedEvent*> trace;
    for (const runtime::MappedEvent& m : events) {
        if (m.ev.trace_id == trace_id) trace.push_back(&m);
    }
    std::sort(trace.begin(), trace.end(), [](const auto* a, const auto* b) {
        if (a->ev.start_ns != b->ev.start_ns) return a->ev.start_ns < b->ev.start_ns;
        return a->ev.span_id < b->ev.span_id;
    });
    std::map<std::string, const runtime::MappedEvent*> by_span;
    for (const auto* m : trace) by_span[m->ev.span_id] = m;

    // A hop is a parent→child call whose two nodes are in different modules.
    auto hop_into = [&](const runtime::MappedEvent* child) -> std::optional<Hop> {
        const auto parent = by_span.find(child->ev.parent_span_id);
        if (child->ev.parent_span_id.empty() || parent == by_span.end()) return std::nullopt;
        const std::string a = module_of(g, parent->second->node_id);
        const std::string b = module_of(g, child->node_id);
        if (a.empty() || b.empty() || a == b) return std::nullopt;
        return Hop{a, b, child->ev.start_ns, child->ev.duration_ns, child->ev.status};
    };

    const std::string module = from_node_id.empty() ? "" : module_of(g, from_node_id);
    std::vector<Hop> hops;
    if (direction == "forward") {
        int64_t from_ns = 0;
        if (!module.empty()) {
            const auto first = std::find_if(trace.begin(), trace.end(), [&](const auto* m) { return module_of(g, m->node_id) == module; });
            if (first == trace.end()) return hops;
            from_ns = (*first)->ev.start_ns;
        }
        for (const auto* m : trace) {
            if (m->ev.start_ns < from_ns) continue;
            if (const auto h = hop_into(m)) hops.push_back(*h);
        }
        return hops;
    }

    const runtime::MappedEvent* at = nullptr;
    for (const auto* m : trace) {
        if (module.empty() || module_of(g, m->node_id) == module) at = m;  // the latest one
    }
    for (int guard = 0; at && guard < 10000; ++guard) {
        if (const auto h = hop_into(at)) hops.push_back(*h);
        const auto parent = by_span.find(at->ev.parent_span_id);
        at = parent == by_span.end() ? nullptr : parent->second;
    }
    return hops;
}

}  // namespace pv::modtrace
