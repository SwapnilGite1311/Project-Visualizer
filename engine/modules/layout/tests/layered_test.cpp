#include <gtest/gtest.h>

#include <chrono>
#include <cmath>
#include <cstdio>

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
