#include <gtest/gtest.h>

#include "../../graph/tests/sample_graph.hpp"
#include "pv/core/error.hpp"
#include "pv/deps/deps.hpp"

using namespace pv;
using Ids = std::vector<std::string>;

namespace {

Ids item_ids(const deps::NeighborsResult& r) {
    Ids ids;
    for (const auto& i : r.items) ids.push_back(i.node_id);
    return ids;
}

}  // namespace

TEST(DepsNeighbors, OutgoingOneAndTwoSteps) {
    const graph::Graph g = graph::testing::sample_graph();
    const auto one = deps::neighbors(g, "function:main.py#main", "out", 1, {});
    EXPECT_EQ(one.root_id, "function:main.py#main");
    EXPECT_EQ(item_ids(one), (Ids{"function:app/a.py#f", "method:app/a.py#C.m"}));
    EXPECT_EQ(one.items[0].distance, 1);
    EXPECT_EQ(one.items[0].direction, "out");
    EXPECT_EQ(one.items[0].ancestor_ids.back(), "function:app/a.py#f");
    EXPECT_EQ(one.edges.size(), 2u);

    const auto two = deps::neighbors(g, "function:main.py#main", "out", 2, {});
    EXPECT_EQ(item_ids(two), (Ids{"function:app/a.py#f", "method:app/a.py#C.m"}));
    EXPECT_EQ(two.edges.size(), 3u);
}

TEST(DepsNeighbors, IncomingIncludesDescendants) {
    const graph::Graph g = graph::testing::sample_graph();
    EXPECT_TRUE(deps::neighbors(g, "function:main.py#main", "in", 1, {}).items.empty());
    EXPECT_EQ(item_ids(deps::neighbors(g, "module:app/a.py", "in", 1, {})), (Ids{"function:main.py#main", "module:main.py"}));
    EXPECT_EQ(item_ids(deps::neighbors(g, "module:app/a.py", "in", 1, {core::EdgeKind::Imports})), Ids{"module:main.py"});
}

TEST(DepsNeighbors, BothDirectionsAndErrors) {
    const graph::Graph g = graph::testing::sample_graph();
    const auto both = deps::neighbors(g, "function:app/a.py#f", "both", 1, {});
    ASSERT_EQ(both.items.size(), 2u);
    EXPECT_EQ(both.items[0].direction, "in");
    EXPECT_EQ(both.items[0].node_id, "function:main.py#main");
    EXPECT_EQ(both.items[1].direction, "out");
    EXPECT_THROW(deps::neighbors(g, "function:app/a.py#f", "sideways", 1, {}), core::PvError);
    EXPECT_THROW(deps::neighbors(g, "function:nope", "out", 1, {}), core::PvError);
}
