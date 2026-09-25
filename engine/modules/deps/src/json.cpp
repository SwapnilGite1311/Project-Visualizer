#include "pv/core/json.hpp"
#include "pv/deps/deps.hpp"

namespace pv::deps {

nlohmann::json to_json(const NeighborsResult& r) {
    nlohmann::json items = nlohmann::json::array();
    for (const NeighborItem& i : r.items) {
        items.push_back({{"node_id", i.node_id}, {"distance", i.distance}, {"direction", i.direction}, {"ancestor_ids", i.ancestor_ids}});
    }
    nlohmann::json edges = nlohmann::json::array();
    for (const core::Edge& e : r.edges) edges.push_back(e);
    return {{"root_id", r.root_id}, {"items", items}, {"edges", edges}};
}

nlohmann::json to_json(const PathResult& r) {
    return {{"found", r.found}, {"node_ids", r.node_ids}, {"edge_ids", r.edge_ids}};
}

}  // namespace pv::deps
