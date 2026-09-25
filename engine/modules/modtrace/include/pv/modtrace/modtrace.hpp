#pragma once
#include <cstdint>
#include <string>
#include <vector>

#include "pv/graph/graph.hpp"
#include "pv/runtime/hub.hpp"

namespace pv::modtrace {

struct Crossing {
    std::string from_id, to_id;
    int count = 0;
    double avg_ms = 0;
    int errors = 0;
    int stalls = 0;
    int loops = 0;
};

struct Hop {
    std::string from_id, to_id;
    int64_t start_ns = 0, duration_ns = 0;
    std::string status;
};

// The module that contains the node (the node itself when it is a module), or "".
std::string module_of(const graph::Graph& g, const std::string& node_id);

// Every runtime call from one module into another since since_ns, aggregated per module pair.
std::vector<Crossing> boundaries(const graph::Graph& g, const std::vector<runtime::MappedEvent>& events, int64_t since_ns,
                                 int loop_threshold);

// Module-to-module hops of one trace, forward from (or backward to) the module of from_node_id.
std::vector<Hop> follow(const graph::Graph& g, const std::vector<runtime::MappedEvent>& events, const std::string& trace_id,
                        const std::string& direction, const std::string& from_node_id);

}  // namespace pv::modtrace
