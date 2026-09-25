#include <algorithm>
#include <map>
#include <set>

#include "pv/core/error.hpp"
#include "pv/deps/deps.hpp"

namespace pv::deps {
namespace {

bool kind_allowed(const std::vector<core::EdgeKind>& kinds, core::EdgeKind k) {
    return kinds.empty() || std::find(kinds.begin(), kinds.end(), k) != kinds.end();
}

std::vector<const core::Edge*> sorted_edges(std::vector<const core::Edge*> edges) {
    std::sort(edges.begin(), edges.end(), [](const core::Edge* a, const core::Edge* b) { return a->id < b->id; });
    return edges;
}

}  // namespace

NeighborsResult neighbors(const graph::Graph& g, const std::string& node_id, const std::string& direction, int depth,
                          const std::vector<core::EdgeKind>& kinds) {
    g.node(node_id);
    if (direction != "in" && direction != "out" && direction != "both") {
        throw core::PvError(core::err::InvalidParams, "bad direction");
    }
    depth = std::clamp(depth, 1, 5);
    std::set<std::string> start{node_id};
    for (const std::string& d : g.descendants(node_id)) start.insert(d);

    NeighborsResult result;
    result.root_id = node_id;
    std::map<std::string, core::Edge> edges;
    std::vector<std::string> directions;
    if (direction != "in") directions.push_back("out");
    if (direction != "out") directions.push_back("in");

    for (const std::string& d : directions) {
        const bool out = d == "out";
        std::set<std::string> visited = start;
        std::vector<std::string> frontier(start.begin(), start.end());
        for (int k = 1; k <= depth && !frontier.empty(); ++k) {
            std::set<std::string> next;
            for (const std::string& cur : frontier) {
                for (const core::Edge* e : sorted_edges(out ? g.out_edges(cur) : g.in_edges(cur))) {
                    if (!kind_allowed(kinds, e->kind)) continue;
                    edges.emplace(e->id, *e);
                    const std::string& other = out ? e->target_id : e->source_id;
                    if (!visited.insert(other).second) continue;
                    result.items.push_back({other, k, d, g.ancestors(other)});
                    next.insert(other);
                }
            }
            frontier.assign(next.begin(), next.end());
        }
    }
    std::sort(result.items.begin(), result.items.end(), [](const NeighborItem& a, const NeighborItem& b) {
        if (a.distance != b.distance) return a.distance < b.distance;
        if (a.direction != b.direction) return a.direction < b.direction;
        return a.node_id < b.node_id;
    });
    for (const auto& [id, e] : edges) result.edges.push_back(e);
    return result;
}

}  // namespace pv::deps
