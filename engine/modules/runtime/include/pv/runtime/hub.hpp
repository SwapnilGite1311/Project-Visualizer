#pragma once
#include <cstdint>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

#include "pv/rpc/notifier.hpp"
#include "pv/runtime/event.hpp"
#include "pv/session/project.hpp"

namespace pv::runtime {

struct MappedEvent {
    RuntimeEvent ev;
    std::string node_id;         // innermost graph node at the event's file and line, or ""
    std::string parent_node_id;  // node of the parent span, or ""
};
struct IngestResult {
    int accepted = 0;
    int mapped = 0;
    int dropped = 0;
};
struct TraceSummary {
    std::string trace_id, root_name;
    int64_t start_ns = 0, duration_ns = 0;
    int spans = 0, errors = 0;
};
struct HubStatus {
    bool active = false;
    int64_t events_total = 0;
    int64_t events_buffered = 0;
    int64_t last_event_ms = 0;
    std::vector<std::string> services;
};
using Listener = std::function<void(const std::string& project_id, const std::vector<MappedEvent>& batch)>;

// Process-wide store of runtime events per project: mapping, ring buffer, 250 ms windows, traces, listeners.
class RuntimeHub {
public:
    std::vector<MappedEvent> map_events(const session::Project& project, const std::vector<RuntimeEvent>& events);
    IngestResult ingest(const session::Project& project, const std::vector<RuntimeEvent>& events, rpc::Notifier& notifier,
                        int64_t now_ms);
    void add_listener(Listener listener);
    HubStatus status(const std::string& project_id, int64_t now_ms) const;
    void clear(const std::string& project_id);
    std::vector<MappedEvent> trace(const std::string& project_id, const std::string& trace_id) const;
    std::vector<TraceSummary> recent_traces(const std::string& project_id, int limit) const;
    std::vector<MappedEvent> events(const std::string& project_id) const;  // copy, oldest first
    void reset_for_tests();

private:
    struct ProjectState;  // defined in hub_state.hpp
    static void link_waiting_children(ProjectState& state, const MappedEvent& parent);
    std::shared_ptr<ProjectState> state_for(const std::string& project_id);
    std::shared_ptr<const ProjectState> find_state(const std::string& project_id) const;
    mutable std::mutex mutex_;
    std::unordered_map<std::string, std::shared_ptr<ProjectState>> states_;
    std::vector<Listener> listeners_;
};

RuntimeHub& hub();  // process-wide instance

}  // namespace pv::runtime
