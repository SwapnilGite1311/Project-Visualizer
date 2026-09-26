#pragma once
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/graph/graph.hpp"
#include "pv/runtime/hub.hpp"
#include "pv/sim/sim.hpp"

namespace pv::sim {

// Replays recorded traces through the sandbox's changes (contracts/rpc/sim/run.result.schema.json, mode "replay").
nlohmann::json run_replay(const Sandbox& sb, const graph::Graph& g, const std::vector<runtime::MappedEvent>& events, int trace_limit);

// Without recorded traces: what would break, from the static dependencies only (mode "static").
nlohmann::json run_static(const Sandbox& sb, const graph::Graph& g);

// Flows between the elements of `parent_id`'s level over the newest traces, with the simulated failures per flow.
nlohmann::json sim_flows(const Sandbox& sb, const graph::Graph& g, const std::vector<runtime::MappedEvent>& events,
                         const std::string& parent_id);

namespace detail {

// One replayed step (span) of a trace.
struct Step {
    const runtime::MappedEvent* ev = nullptr;
    int parent = -1;           // index of the parent step in the same trace, -1 = root
    bool real_failed = false;
    bool sim_failed = false;
    double real_ms = 0;
    double sim_ms = 0;         // own simulated time plus the extra time of the steps below it
};

struct ReplayedTrace {
    std::string trace_id;
    std::vector<Step> steps;
    bool real_failed = false;
    bool sim_failed = false;
    double real_ms = 0;
    double sim_ms = 0;
};

// The newest `limit` traces of `events`, replayed through `sb`.
std::vector<ReplayedTrace> replay(const Sandbox& sb, const graph::Graph& g, const std::vector<runtime::MappedEvent>& events, int limit);

}  // namespace detail
}  // namespace pv::sim
