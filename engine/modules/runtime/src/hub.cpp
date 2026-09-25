#include <algorithm>

#include "hub_state.hpp"
#include "pv/locate/locate.hpp"

namespace pv::runtime {

RuntimeHub& hub() {
    static RuntimeHub instance;
    return instance;
}

void RuntimeHub::reset_for_tests() {
    std::lock_guard lock(mutex_);
    states_.clear();
    listeners_.clear();
}

std::shared_ptr<RuntimeHub::ProjectState> RuntimeHub::state_for(const std::string& project_id) {
    auto& s = states_[project_id];
    if (!s) s = std::make_shared<ProjectState>();
    return s;
}

std::shared_ptr<const RuntimeHub::ProjectState> RuntimeHub::find_state(const std::string& project_id) const {
    const auto it = states_.find(project_id);
    return it == states_.end() ? nullptr : it->second;
}

std::vector<MappedEvent> RuntimeHub::map_events(const session::Project& project, const std::vector<RuntimeEvent>& events) {
    std::vector<MappedEvent> mapped;
    mapped.reserve(events.size());
    project.read([&](const graph::Graph& g) {
        for (const RuntimeEvent& ev : events) {
            MappedEvent m{ev, "", ""};
            if (!ev.file_path.empty()) {
                if (const auto rel = locate::to_project_relative(project.root_path(), ev.file_path)) {
                    if (const core::Node* n = g.innermost_at(*rel, ev.line)) m.node_id = n->id;
                }
            }
            mapped.push_back(std::move(m));
        }
        return 0;
    });
    std::lock_guard lock(mutex_);
    auto state = state_for(project.id());
    if (state->span_nodes.size() > kSpanMapMax) state->span_nodes.clear();
    if (state->waiting_children.size() > kSpanMapMax) state->waiting_children.clear();
    for (MappedEvent& m : mapped) {
        if (!m.ev.parent_span_id.empty()) {
            const auto it = state->span_nodes.find(m.ev.parent_span_id);
            if (it != state->span_nodes.end()) m.parent_node_id = it->second;
        }
        if (!m.node_id.empty()) state->span_nodes[m.ev.span_id] = m.node_id;
    }
    return mapped;
}

// This event's span may be the parent of children that arrived earlier: give those buffered children their parent node
// (module tracing and live flows read it) and count the flows now.
void RuntimeHub::link_waiting_children(ProjectState& state, const MappedEvent& parent) {
    const auto it = state.waiting_children.find(parent.ev.span_id);
    if (it == state.waiting_children.end()) return;
    std::set<std::string> wanted(it->second.begin(), it->second.end());
    state.waiting_children.erase(it);
    std::size_t scanned = 0;
    for (auto b = state.buffer.rbegin(); b != state.buffer.rend() && !wanted.empty() && scanned < kLateLinkScan; ++b, ++scanned) {
        if (wanted.erase(b->ev.event_id) == 0 || !b->parent_node_id.empty()) continue;
        b->parent_node_id = parent.node_id;
        if (b->node_id != parent.node_id) ++state.edge_flows[parent.node_id + "|" + b->node_id];
    }
}

IngestResult RuntimeHub::ingest(const session::Project& project, const std::vector<RuntimeEvent>& events, rpc::Notifier& notifier,
                                int64_t now_ms) {
    const std::vector<MappedEvent> mapped = map_events(project, events);
    IngestResult result;
    result.accepted = static_cast<int>(events.size());
    nlohmann::json update;
    std::vector<Listener> listeners;
    {
        std::lock_guard lock(mutex_);
        auto state = state_for(project.id());
        for (const MappedEvent& m : mapped) {
            state->buffer.push_back(m);
            if (state->buffer.size() > kBufferMax) {
                state->buffer.pop_front();
                ++result.dropped;
            }
            ++state->events_total;
            if (!m.ev.service.empty()) state->services.insert(m.ev.service);
            const int64_t end_ns = m.ev.start_ns + m.ev.duration_ns;
            if (state->window_start_ns == 0 || m.ev.start_ns < state->window_start_ns) state->window_start_ns = m.ev.start_ns;
            state->window_end_ns = std::max(state->window_end_ns, end_ns);
            if (m.node_id.empty()) continue;
            ++result.mapped;
            ++state->node_hits[m.node_id];
            if (!m.parent_node_id.empty() && m.parent_node_id != m.node_id) ++state->edge_flows[m.parent_node_id + "|" + m.node_id];
            if (m.parent_node_id.empty() && !m.ev.parent_span_id.empty()) state->waiting_children[m.ev.parent_span_id].push_back(m.ev.event_id);
            link_waiting_children(*state, m);
            if (is_error_event(m.ev)) {
                state->errors.push_back({{"node_id", m.node_id},
                                         {"type", m.ev.error ? m.ev.error->type : ""},
                                         {"message", m.ev.error ? m.ev.error->message : ""},
                                         {"event_id", m.ev.event_id}});
            }
            if (m.ev.kind == "stall") state->stalls.push_back({{"node_id", m.node_id}, {"duration_ns", m.ev.duration_ns}});
        }
        if (!mapped.empty()) state->last_event_ms = now_ms;
        if (state->window_start_ms == 0) state->window_start_ms = now_ms;
        if (now_ms - state->window_start_ms >= kWindowMs) {
            update = {{"project_id", project.id()},
                      {"window_start_ns", state->window_start_ns},
                      {"window_end_ns", state->window_end_ns},
                      {"node_hits", state->node_hits},
                      {"edge_flows", state->edge_flows},
                      {"errors", state->errors},
                      {"stalls", state->stalls}};
            state->reset_window();
        }
        listeners = listeners_;
    }
    if (!update.is_null()) notifier.notify("runtime.update", update);
    for (const Listener& l : listeners) l(project.id(), mapped);
    return result;
}

void RuntimeHub::add_listener(Listener listener) {
    std::lock_guard lock(mutex_);
    listeners_.push_back(std::move(listener));
}

HubStatus RuntimeHub::status(const std::string& project_id, int64_t now_ms) const {
    std::lock_guard lock(mutex_);
    HubStatus s;
    const auto state = find_state(project_id);
    if (!state) return s;
    s.events_total = state->events_total;
    s.events_buffered = static_cast<int64_t>(state->buffer.size());
    s.last_event_ms = state->last_event_ms;
    s.active = state->last_event_ms > 0 && now_ms - state->last_event_ms <= 10000;
    s.services.assign(state->services.begin(), state->services.end());
    return s;
}

void RuntimeHub::clear(const std::string& project_id) {
    std::lock_guard lock(mutex_);
    states_.erase(project_id);
}

std::vector<MappedEvent> RuntimeHub::events(const std::string& project_id) const {
    std::lock_guard lock(mutex_);
    const auto state = find_state(project_id);
    if (!state) return {};
    return {state->buffer.begin(), state->buffer.end()};
}

}  // namespace pv::runtime
