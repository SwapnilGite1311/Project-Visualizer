#include <algorithm>
#include <map>
#include <set>

#include "pv/deps/deps.hpp"

namespace pv::deps {

PathResult find_path(const graph::Graph& g, const std::string& from_id, const std::string& to_id,
                     const std::vector<core::EdgeKind>& kinds, int max_depth) {
    g.node(from_id);
    g.node(to_id);
    max_depth = std::clamp(max_depth, 1, 12);
    std::set<std::string> start{from_id};
    for (const std::string& d : g.descendants(from_id)) start.insert(d);

    std::map<std::string, std::pair<std::string, std::string>> parent;  // node -> (previous node, edge id)
    std::set<std::string> visited = start;
    std::vector<std::string> frontier(start.begin(), start.end());
    for (int depth = 1; depth <= max_depth && !frontier.empty(); ++depth) {
        std::vector<std::string> next;
        for (const std::string& cur : frontier) {
            std::vector<const core::Edge*> out = g.out_edges(cur);
            std::sort(out.begin(), out.end(), [](const core::Edge* a, const core::Edge* b) { return a->id < b->id; });
            for (const core::Edge* e : out) {
                if (!kinds.empty() && std::find(kinds.begin(), kinds.end(), e->kind) == kinds.end()) continue;
                const std::string& node = e->target_id;
                if (!visited.insert(node).second) continue;
                parent[node] = {cur, e->id};
                if (node == to_id || g.is_descendant(node, to_id)) {
                    PathResult r;
                    r.found = true;
                    std::string at = node;
                    while (!start.count(at)) {
                        r.node_ids.push_back(at);
                        r.edge_ids.push_back(parent[at].second);
                        at = parent[at].first;
                    }
                    r.node_ids.push_back(at);
                    std::reverse(r.node_ids.begin(), r.node_ids.end());
                    std::reverse(r.edge_ids.begin(), r.edge_ids.end());
                    return r;
                }
                next.push_back(node);
            }
        }
        std::sort(next.begin(), next.end());
        frontier = next;
    }
    return {};
}

}  // namespace pv::deps
