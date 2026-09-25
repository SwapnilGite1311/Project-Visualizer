#pragma once
#include <cstdint>
#include <map>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/graph/graph.hpp"
#include "pv/health/health.hpp"
#include "pv/runtime/hub.hpp"

namespace pv::rtsync {

// The level view under parent_id plus live statistics and flows rolled up to its elements
// (contracts/rpc/rtsync/level_view.result.schema.json). Only events of the last window_ns count.
nlohmann::json live_level_view(const graph::Graph& g, const std::string& parent_id, const std::vector<runtime::MappedEvent>& events,
                               const std::map<std::string, health::HealthInfo>& health, int64_t window_ns);

}  // namespace pv::rtsync
