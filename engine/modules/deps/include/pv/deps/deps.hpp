#pragma once
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/core/types.hpp"
#include "pv/graph/graph.hpp"

namespace pv::deps {

struct NeighborItem {
    std::string node_id;
    int distance = 0;
    std::string direction;
    std::vector<std::string> ancestor_ids;
};
struct NeighborsResult {
    std::string root_id;
    std::vector<NeighborItem> items;
    std::vector<core::Edge> edges;
};
struct PathResult {
    bool found = false;
    std::vector<std::string> node_ids;
    std::vector<std::string> edge_ids;
};

NeighborsResult neighbors(const graph::Graph& g, const std::string& node_id, const std::string& direction, int depth,
                          const std::vector<core::EdgeKind>& kinds);
PathResult find_path(const graph::Graph& g, const std::string& from_id, const std::string& to_id,
                     const std::vector<core::EdgeKind>& kinds, int max_depth);
std::vector<std::vector<std::string>> find_cycles(const graph::Graph& g, int level, int limit);
nlohmann::json to_json(const NeighborsResult& r);
nlohmann::json to_json(const PathResult& r);

}  // namespace pv::deps
