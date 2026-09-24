#include <algorithm>
#include <map>
#include <set>

#include "pv/analysis/analysis.hpp"
#include "pv/core/json.hpp"

namespace pv::analysis {

Json build_call_tree(const graph::Graph& g, const std::string& node_id, int depth) {
    g.node(node_id);
    depth = std::clamp(depth, 1, 6);
    std::set<std::string> visited{node_id};
    std::map<std::string, const core::Edge*> traversed;
    std::vector<std::string> frontier{node_id};
    for (int d = 0; d < depth && !frontier.empty(); ++d) {
        std::vector<std::string> next;
        for (const std::string& id : frontier) {
            for (const core::Edge* e : g.out_edges(id)) {
                if (e->kind != core::EdgeKind::Calls) continue;
                traversed.emplace(e->id, e);
                if (visited.insert(e->target_id).second) next.push_back(e->target_id);
            }
        }
        frontier = next;
    }
    Json nodes = Json::array();
    for (const std::string& id : visited) nodes.push_back(g.node(id));
    Json edges = Json::array();
    for (const auto& [id, e] : traversed) edges.push_back(*e);
    return Json{{"root_id", node_id}, {"nodes", nodes}, {"edges", edges}};
}

}  // namespace pv::analysis
