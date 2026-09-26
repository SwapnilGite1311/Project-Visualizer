#include <gtest/gtest.h>

#include <chrono>
#include <cmath>
#include <cstdio>

#include "pv/layout/layout.hpp"

using namespace pv::layout;

namespace {

double dist(const Point& a, const Point& b) {
    return std::sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) + (a.z - b.z) * (a.z - b.z));
}

// Two clusters of 10 nodes, densely connected inside, one edge between them.
void clusters(std::vector<LNode>& nodes, std::vector<LEdge>& edges) {
    for (int c = 0; c < 2; ++c) {
        for (int i = 0; i < 10; ++i) nodes.push_back(LNode{"c" + std::to_string(c) + "n" + std::to_string(i)});
        for (int i = 0; i < 10; ++i) {
            for (int j = i + 1; j < 10; ++j) {
                const std::string a = "c" + std::to_string(c) + "n" + std::to_string(i);
                const std::string b = "c" + std::to_string(c) + "n" + std::to_string(j);
                edges.push_back(LEdge{a + b, a, b});
            }
        }
    }
    edges.push_back(LEdge{"bridge", "c0n0", "c1n0"});
}

}  // namespace

TEST(LayoutForce3d, ConnectedNodesEndCloser) {
    std::vector<LNode> nodes;
    std::vector<LEdge> edges;
    clusters(nodes, edges);
    const auto r = force3d(nodes, edges);
    ASSERT_EQ(r.positions.size(), 20u);
    double inside = 0, across = 0;
    int ni = 0, na = 0;
    for (int i = 0; i < 10; ++i) {
        for (int j = 0; j < 10; ++j) {
            const auto& a0 = r.positions.at("c0n" + std::to_string(i));
            if (i != j) {
                inside += dist(a0, r.positions.at("c0n" + std::to_string(j)));
                ++ni;
            }
            across += dist(a0, r.positions.at("c1n" + std::to_string(j)));
            ++na;
        }
    }
    EXPECT_LT(inside / ni, across / na);
}

TEST(LayoutForce3d, DeterministicAndCentred) {
    std::vector<LNode> nodes;
    std::vector<LEdge> edges;
    clusters(nodes, edges);
    const auto a = force3d(nodes, edges, 100);
    const auto b = force3d(nodes, edges, 100);
    double cx = 0;
    for (const auto& [id, p] : a.positions) {
        EXPECT_DOUBLE_EQ(p.x, b.positions.at(id).x);
        EXPECT_DOUBLE_EQ(p.z, b.positions.at(id).z);
        cx += p.x;
    }
    EXPECT_NEAR(cx / 20, 0, 1e-6);
}

TEST(LayoutForce3d, LargeGraphUsesTheOctree) {
    std::vector<LNode> nodes;
    std::vector<LEdge> edges;
    for (int i = 0; i < 1200; ++i) nodes.push_back(LNode{"n" + std::to_string(i)});
    for (int i = 1; i < 1200; ++i) edges.push_back(LEdge{"e" + std::to_string(i), "n" + std::to_string(i / 2), "n" + std::to_string(i)});
    const auto t0 = std::chrono::steady_clock::now();
    const auto r = force3d(nodes, edges, 60);
    const auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - t0).count();
    std::printf("[layout] force3d 1200 nodes, 60 iterations: %lld ms\n", static_cast<long long>(ms));
    ASSERT_EQ(r.positions.size(), 1200u);
    for (const auto& [id, p] : r.positions) ASSERT_TRUE(std::isfinite(p.x) && std::isfinite(p.y) && std::isfinite(p.z)) << id;
}
