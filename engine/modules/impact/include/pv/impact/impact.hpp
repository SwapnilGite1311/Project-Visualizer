#pragma once
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/core/types.hpp"
#include "pv/graph/graph.hpp"

namespace pv::impact {

struct AffectedNode {
    std::string node_id;
    int distance = 0;
    core::EdgeKind via = core::EdgeKind::Calls;
    std::string from_id;                    // the node it depends on
    std::vector<std::string> ancestor_ids;  // project root first, node itself last
};
struct Risk { int score = 0; std::string level; std::vector<std::string> factors; };
struct ImpactResult { std::string root_id; std::vector<AffectedNode> affected; Risk risk; };

ImpactResult analyze_impact(const graph::Graph& g, const std::string& node_id, int max_depth);
Risk compute_risk(const graph::Graph& g, const std::vector<AffectedNode>& affected);
nlohmann::json to_json(const ImpactResult& result);

}  // namespace pv::impact
