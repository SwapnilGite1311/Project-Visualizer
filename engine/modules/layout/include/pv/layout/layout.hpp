#pragma once
#include <map>
#include <string>
#include <vector>

namespace pv::layout {

struct LNode {
    std::string id;
    double w = 160;
    double h = 48;
};

struct LEdge {
    std::string id;
    std::string source;
    std::string target;
};

struct Point {
    double x = 0;
    double y = 0;
    double z = 0;
};

struct LayoutResult {
    std::map<std::string, Point> positions;                // node centres
    std::map<std::string, std::vector<Point>> edge_points;  // source centre, bends, target centre (2D only)
};

struct LayeredOptions {
    std::string rankdir = "TB";  // TB = top to bottom, LR = left to right
    double nodesep = 40;         // gap between neighbours in one rank
    double ranksep = 80;         // gap between ranks
};

// Dagre-style layered (Sugiyama) layout: cycle breaking, longest-path ranks, dummy nodes on long edges,
// barycenter ordering, neighbour-aligned coordinates. Nodes without any edge go to a grid below. Deterministic.
LayoutResult layered(const std::vector<LNode>& nodes, const std::vector<LEdge>& edges, const LayeredOptions& options = {});

// 3D force-directed layout (Fruchterman-Reingold; Barnes-Hut above 500 nodes). Deterministic (seeded by the ids).
LayoutResult force3d(const std::vector<LNode>& nodes, const std::vector<LEdge>& edges, int iterations = 300);

}  // namespace pv::layout
