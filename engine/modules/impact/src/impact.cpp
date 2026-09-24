#include "pv/impact/impact.hpp"

#include <algorithm>
#include <set>
#include <tuple>
#include <unordered_set>

namespace pv::impact {

ImpactResult analyze_impact(const graph::Graph& g, const std::string& node_id, int max_depth) {
    g.node(node_id);
    max_depth = std::clamp(max_depth, 1, 10);
    ImpactResult result;
    result.root_id = node_id;

    std::vector<std::string> inside = g.descendants(node_id);
    inside.push_back(node_id);
    std::unordered_set<std::string> visited(inside.begin(), inside.end());
    std::vector<std::string> frontier = inside;
    std::sort(frontier.begin(), frontier.end());

    for (int d = 1; d <= max_depth; ++d) {
        std::vector<std::string> next;
        for (const std::string& cur : frontier) {
            std::vector<const core::Edge*> edges = g.in_edges(cur);
            std::sort(edges.begin(), edges.end(), [](const core::Edge* a, const core::Edge* b) { return a->id < b->id; });
            for (const core::Edge* e : edges) {
                const std::string& s = e->source_id;
                if (visited.count(s)) continue;
                visited.insert(s);
                result.affected.push_back(AffectedNode{s, d, e->kind, cur, g.ancestors(s)});
                next.push_back(s);
            }
        }
        if (next.empty()) break;
        std::sort(next.begin(), next.end());
        frontier = next;
    }

    std::sort(result.affected.begin(), result.affected.end(), [](const AffectedNode& a, const AffectedNode& b) {
        return std::tie(a.distance, a.node_id) < std::tie(b.distance, b.node_id);
    });
    result.risk = compute_risk(g, result.affected);
    return result;
}

Risk compute_risk(const graph::Graph& g, const std::vector<AffectedNode>& affected) {
    int d1 = 0;
    int dn = 0;
    std::set<std::string> groups;
    for (const AffectedNode& a : affected) {
        if (a.distance == 1) {
            ++d1;
        } else {
            ++dn;
        }
        std::string group = "project:";
        for (auto it = a.ancestor_ids.rbegin(); it != a.ancestor_ids.rend(); ++it) {
            const core::Node* n = g.find_node(*it);
            if (n && n->kind == core::NodeKind::Package) {
                group = *it;
                break;
            }
        }
        groups.insert(group);
    }
    const int group_count = static_cast<int>(groups.size());
    Risk risk;
    risk.score = std::min(100, d1 * 8 + dn * 3 + std::max(0, group_count - 1) * 10);
    if (risk.score < 20) {
        risk.level = "low";
    } else if (risk.score < 45) {
        risk.level = "medium";
    } else if (risk.score < 70) {
        risk.level = "high";
    } else {
        risk.level = "critical";
    }
    risk.factors = {std::to_string(d1) + " direct dependents", std::to_string(dn) + " indirect dependents",
                    "spans " + std::to_string(group_count) + " packages"};
    return risk;
}

nlohmann::json to_json(const ImpactResult& result) {
    nlohmann::json affected = nlohmann::json::array();
    for (const AffectedNode& a : result.affected) {
        affected.push_back({{"node_id", a.node_id},
                            {"distance", a.distance},
                            {"via", core::to_string(a.via)},
                            {"from_id", a.from_id},
                            {"ancestor_ids", a.ancestor_ids}});
    }
    return {{"root_id", result.root_id},
            {"affected", affected},
            {"risk", {{"score", result.risk.score}, {"level", result.risk.level}, {"factors", result.risk.factors}}}};
}

}  // namespace pv::impact
