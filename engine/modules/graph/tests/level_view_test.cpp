#include <gtest/gtest.h>

#include <algorithm>

#include "pv/core/error.hpp"
#include "pv/graph/level_view.hpp"
#include "sample_graph.hpp"

using namespace pv;
using namespace pv::graph;

namespace {

const core::Edge* find(const LevelView& v, const std::string& id) {
    for (const core::Edge& e : v.edges) {
        if (e.id == id) return &e;
    }
    return nullptr;
}

bool has_node(const LevelView& v, const std::string& id) {
    return std::any_of(v.nodes.begin(), v.nodes.end(), [&](const core::Node& n) { return n.id == id; });
}

}  // namespace

TEST(GraphLevelView, ProjectLevel) {
    const Graph g = pv::graph::testing::sample_graph();
    const LevelView v = build_level_view(g, "project:");
    EXPECT_EQ(v.parent.id, "project:");
    ASSERT_EQ(v.nodes.size(), 3u);
    EXPECT_TRUE(has_node(v, "package:app"));
    EXPECT_TRUE(has_node(v, "module:main.py"));
    EXPECT_TRUE(has_node(v, "external:os"));
    ASSERT_EQ(v.edges.size(), 3u);
    ASSERT_NE(find(v, "agg|calls|module:main.py|package:app"), nullptr);
    EXPECT_EQ(find(v, "agg|calls|module:main.py|package:app")->weight, 3);
    ASSERT_NE(find(v, "agg|imports|module:main.py|package:app"), nullptr);
    EXPECT_EQ(find(v, "agg|imports|module:main.py|package:app")->weight, 1);
    ASSERT_NE(find(v, "agg|imports|package:app|external:os"), nullptr);
    EXPECT_EQ(find(v, "agg|imports|package:app|external:os")->weight, 1);
}

TEST(GraphLevelView, PackageLevel) {
    const LevelView v = build_level_view(pv::graph::testing::sample_graph(), "package:app");
    EXPECT_EQ(v.nodes.size(), 1u);
    EXPECT_TRUE(v.edges.empty());
}

TEST(GraphLevelView, ModuleLevel) {
    const LevelView v = build_level_view(pv::graph::testing::sample_graph(), "module:app/a.py");
    ASSERT_EQ(v.nodes.size(), 2u);
    EXPECT_EQ(v.nodes[0].id, "class:app/a.py#C");
    EXPECT_EQ(v.nodes[1].id, "function:app/a.py#f");
    ASSERT_EQ(v.edges.size(), 1u);
    EXPECT_EQ(v.edges[0].id, "agg|calls|function:app/a.py#f|class:app/a.py#C");
    EXPECT_EQ(v.edges[0].weight, 1);
}

TEST(GraphLevelView, UnknownParentThrows) {
    EXPECT_THROW(build_level_view(pv::graph::testing::sample_graph(), "module:nope.py"), core::PvError);
}
