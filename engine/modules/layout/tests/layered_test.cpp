#include <gtest/gtest.h>

#include <chrono>
#include <cmath>
#include <cstdio>
#include <map>
#include <set>
#include <string>

#include "pv/layout/layout.hpp"

using namespace pv::layout;

namespace {

std::vector<LNode> named(std::initializer_list<const char*> ids) {
    std::vector<LNode> out;
    for (const char* id : ids) out.push_back(LNode{id, 100, 40});
    return out;
}

LEdge edge(const std::string& s, const std::string& t) {
    return LEdge{s + ">" + t, s, t};
}

bool overlap(const Point& a, const Point& b, double w, double h) {
    return std::abs(a.x - b.x) < w && std::abs(a.y - b.y) < h;
}

void expect_no_overlaps(const LayoutResult& r, double w = 100, double h = 40) {
    std::vector<std::pair<std::string, Point>> all(r.positions.begin(), r.positions.end());
    for (std::size_t i = 0; i < all.size(); ++i) {
        for (std::size_t j = i + 1; j < all.size(); ++j) {
            EXPECT_FALSE(overlap(all[i].second, all[j].second, w, h)) << all[i].first << " / " << all[j].first;
        }
    }
}

}  // namespace

TEST(LayoutLayered, ChainGoesDown) {
    const auto r = layered(named({"a", "b", "c"}), {edge("a", "b"), edge("b", "c")});
    EXPECT_LT(r.positions.at("a").y, r.positions.at("b").y);
    EXPECT_LT(r.positions.at("b").y, r.positions.at("c").y);
    EXPECT_NEAR(r.positions.at("a").x, r.positions.at("c").x, 1e-6);  // a straight line
    ASSERT_EQ(r.edge_points.at("a>b").size(), 2u);
}

TEST(LayoutLayered, DiamondHasNoOverlapsAndLongEdgesBend) {
    const auto r = layered(named({"top", "left", "right", "bottom"}),
                           {edge("top", "left"), edge("top", "right"), edge("left", "bottom"), edge("right", "bottom"),
                            edge("top", "bottom")});
    expect_no_overlaps(r);
    EXPECT_EQ(r.positions.at("left").y, r.positions.at("right").y);
    // top -> bottom spans two ranks: it goes through one dummy node.
    EXPECT_EQ(r.edge_points.at("top>bottom").size(), 3u);
}

TEST(LayoutLayered, CyclesTerminateAndKeepEdgeDirection) {
    const auto r = layered(named({"a", "b", "c"}), {edge("a", "b"), edge("b", "c"), edge("c", "a")});
    ASSERT_EQ(r.positions.size(), 3u);
    expect_no_overlaps(r);
    const auto& pts = r.edge_points.at("c>a");
    ASSERT_GE(pts.size(), 2u);
    EXPECT_NEAR(pts.front().y, r.positions.at("c").y, 1e-6);  // starts at the source even when reversed inside
    EXPECT_NEAR(pts.back().y, r.positions.at("a").y, 1e-6);
}

TEST(LayoutLayered, LeftToRightAndLonelyNodes) {
    const auto r = layered(named({"a", "b", "x", "y", "z"}), {edge("a", "b")}, LayeredOptions{"LR", 40, 80});
    EXPECT_LT(r.positions.at("a").x, r.positions.at("b").x);
    EXPECT_NEAR(r.positions.at("a").y, r.positions.at("b").y, 1e-6);
    // Nodes without edges are placed after the layered part (to the right in LR) without overlaps.
    EXPECT_GT(r.positions.at("x").x, r.positions.at("b").x);
    expect_no_overlaps(r);
}

TEST(LayoutLayered, Deterministic) {
    const auto nodes = named({"m1", "m2", "m3", "m4", "m5", "m6"});
    const std::vector<LEdge> edges{edge("m1", "m3"), edge("m2", "m3"), edge("m3", "m4"), edge("m1", "m5"), edge("m5", "m6"),
                                   edge("m2", "m6")};
    const auto a = layered(nodes, edges);
    auto shuffled = nodes;
    std::reverse(shuffled.begin(), shuffled.end());
    const auto b = layered(shuffled, edges);
    for (const auto& [id, p] : a.positions) {
        EXPECT_DOUBLE_EQ(p.x, b.positions.at(id).x) << id;
        EXPECT_DOUBLE_EQ(p.y, b.positions.at(id).y) << id;
    }
    expect_no_overlaps(a);
}

TEST(LayoutLayered, EmptyAndUnknownEdges) {
    EXPECT_TRUE(layered({}, {}).positions.empty());
    const auto r = layered(named({"a"}), {edge("a", "ghost"), edge("a", "a")});
    EXPECT_EQ(r.positions.size(), 1u);
    EXPECT_TRUE(r.edge_points.empty());
}

TEST(LayoutLayered, TwoThousandNodes) {
    std::vector<LNode> nodes;
    std::vector<LEdge> edges;
    for (int i = 0; i < 2000; ++i) nodes.push_back(LNode{"n" + std::to_string(i), 120, 48});
    for (int i = 1; i < 2000; ++i) {
        const std::string a = "n" + std::to_string(i / 3), b = "n" + std::to_string(i);
        edges.push_back(LEdge{a + ">" + b, a, b});
    }
    const auto t0 = std::chrono::steady_clock::now();
    const auto r = layered(nodes, edges);
    const auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - t0).count();
    std::printf("[layout] layered 2000 nodes: %lld ms\n", static_cast<long long>(ms));
    EXPECT_EQ(r.positions.size(), 2000u);
}

namespace {

std::pair<std::vector<LNode>, std::vector<LEdge>> hub_with_leaves(int leaves) {
    std::vector<LNode> nodes{LNode{"hub", 100, 40}};
    std::vector<LEdge> edges;
    for (int i = 0; i < leaves; ++i) {
        const std::string id = "leaf" + std::to_string(100 + i);
        nodes.push_back(LNode{id, 100, 40});
        edges.push_back(edge("hub", id));
    }
    return {nodes, edges};
}

}  // namespace

TEST(LayoutLayered, VeryWideRankWrapsOntoRows) {
    const auto [nodes, edges] = hub_with_leaves(40);
    const auto r = layered(nodes, edges);
    std::map<double, int> per_row;
    for (const auto& [id, p] : r.positions) {
        if (id == "hub") continue;
        EXPECT_GT(p.y, r.positions.at("hub").y) << id;  // every leaf below the hub
        ++per_row[p.y];
    }
    // automatic row size for 41 nodes: max(6, ceil(1.3 * sqrt(41))) = 9
    EXPECT_GE(per_row.size(), 5u);
    for (const auto& [y, count] : per_row) EXPECT_LE(count, 9) << "row at y=" << y;
    expect_no_overlaps(r);
    // the picture is far less wide than one row of 40 boxes
    double min_x = 1e9, max_x = -1e9;
    for (const auto& [id, p] : r.positions) {
        min_x = std::min(min_x, p.x);
        max_x = std::max(max_x, p.x);
    }
    EXPECT_LT(max_x - min_x, 9 * 140.0);
    // deterministic
    const auto again = layered(nodes, edges);
    for (const auto& [id, p] : r.positions) {
        EXPECT_DOUBLE_EQ(again.positions.at(id).x, p.x);
        EXPECT_DOUBLE_EQ(again.positions.at(id).y, p.y);
    }
}

TEST(LayoutLayered, RowSizeCanBeRaised) {
    const auto [nodes, edges] = hub_with_leaves(40);
    LayeredOptions options;
    options.max_row = 1000;
    const auto r = layered(nodes, edges, options);
    std::set<double> ys;
    for (const auto& [id, p] : r.positions) {
        if (id != "hub") ys.insert(p.y);
    }
    EXPECT_EQ(ys.size(), 1u);
}

TEST(LayoutLayered, LongEdgesFollowWrappedRows) {
    // top -> hub -> 30 leaves, and top -> one leaf directly (a long edge with a bend point in the hub's rank)
    auto [nodes, edges] = hub_with_leaves(30);
    nodes.push_back(LNode{"top", 100, 40});
    edges.push_back(edge("top", "hub"));
    edges.push_back(edge("top", "leaf129"));
    const auto r = layered(nodes, edges);
    double min_x = 1e9, max_x = -1e9;
    for (const auto& [id, p] : r.positions) {
        min_x = std::min(min_x, p.x);
        max_x = std::max(max_x, p.x);
    }
    for (const auto& p : r.edge_points.at("top>leaf129")) {
        EXPECT_GE(p.x, min_x - 60);
        EXPECT_LE(p.x, max_x + 60);  // the edge stays within the picture
    }
}
