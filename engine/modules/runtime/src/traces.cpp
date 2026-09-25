#include <algorithm>
#include <map>
#include <set>

#include "hub_state.hpp"

namespace pv::runtime {

std::vector<MappedEvent> RuntimeHub::trace(const std::string& project_id, const std::string& trace_id) const {
    std::vector<MappedEvent> steps;
    {
        std::lock_guard lock(mutex_);
        const auto state = find_state(project_id);
        if (!state) return steps;
        for (const MappedEvent& m : state->buffer) {
            if (m.ev.trace_id == trace_id) steps.push_back(m);
        }
    }
    std::sort(steps.begin(), steps.end(), [](const MappedEvent& a, const MappedEvent& b) {
        if (a.ev.start_ns != b.ev.start_ns) return a.ev.start_ns < b.ev.start_ns;
        return a.ev.span_id < b.ev.span_id;
    });
    return steps;
}

std::vector<TraceSummary> RuntimeHub::recent_traces(const std::string& project_id, int limit) const {
    std::map<std::string, std::vector<const MappedEvent*>> by_trace;
    std::vector<TraceSummary> out;
    std::lock_guard lock(mutex_);
    const auto state = find_state(project_id);
    if (!state) return out;
    for (const MappedEvent& m : state->buffer) by_trace[m.ev.trace_id].push_back(&m);
    for (const auto& [trace_id, events] : by_trace) {
        std::set<std::string> spans;
        for (const MappedEvent* m : events) spans.insert(m->ev.span_id);
        TraceSummary t;
        t.trace_id = trace_id;
        t.start_ns = events.front()->ev.start_ns;
        int64_t end_ns = 0;
        const MappedEvent* root = nullptr;
        for (const MappedEvent* m : events) {
            t.start_ns = std::min(t.start_ns, m->ev.start_ns);
            end_ns = std::max(end_ns, m->ev.start_ns + m->ev.duration_ns);
            if (is_error_event(m->ev)) ++t.errors;
            // The root has no parent, or a parent that is not in this trace; the earliest wins.
            const bool is_root = m->ev.parent_span_id.empty() || !spans.count(m->ev.parent_span_id);
            if (is_root && (!root || m->ev.start_ns < root->ev.start_ns)) root = m;
        }
        t.duration_ns = end_ns - t.start_ns;
        t.spans = static_cast<int>(events.size());
        t.root_name = root ? root->ev.name : events.front()->ev.name;
        out.push_back(t);
    }
    std::sort(out.begin(), out.end(), [](const TraceSummary& a, const TraceSummary& b) {
        if (a.start_ns != b.start_ns) return a.start_ns > b.start_ns;
        return a.trace_id < b.trace_id;
    });
    if (static_cast<int>(out.size()) > limit) out.resize(std::max(0, limit));
    return out;
}

}  // namespace pv::runtime
