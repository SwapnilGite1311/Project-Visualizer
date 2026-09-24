#pragma once
#include <string>
#include <vector>
#include "pv/core/types.hpp"
#include "pv/graph/graph.hpp"

namespace pv::graph {
struct LevelView {
    core::Node parent;
    std::vector<core::Node> nodes;
    std::vector<core::Edge> edges;
};
LevelView build_level_view(const Graph& graph, const std::string& parent_id);
}  // namespace pv::graph
