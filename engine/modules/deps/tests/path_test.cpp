#include <gtest/gtest.h>

#include "../../graph/tests/sample_graph.hpp"
#include "pv/core/error.hpp"
#include "pv/deps/deps.hpp"

using namespace pv;
using Ids = std::vector<std::string>;

TEST(DepsPath, FindsTheShortestRoute) {
    const graph::Graph g = graph::testing::sample_graph();
    const auto r = deps::find_path(g, "module:main.py", "package:app", {}, 8);
    EXPECT_TRUE(r.found);
    EXPECT_EQ(r.node_ids, (Ids{"function:main.py#main", "function:app/a.py#f"}));
    EXPECT_EQ(r.edge_ids, Ids{"calls|function:main.py#main|function:app/a.py#f"});
}

TEST(DepsPath, FollowsEdgeKinds) {
    const graph::Graph g = graph::testing::sample_graph();
    const auto r = deps::find_path(g, "module:main.py", "external:os", {core::EdgeKind::Imports}, 8);
    EXPECT_TRUE(r.found);
    EXPECT_EQ(r.node_ids, (Ids{"module:main.py", "module:app/a.py", "external:os"}));
    EXPECT_EQ(r.edge_ids.size(), 2u);
    EXPECT_FALSE(deps::find_path(g, "module:main.py", "external:os", {core::EdgeKind::Imports}, 1).found);
}

TEST(DepsPath, NotFoundAndUnknown) {
    const graph::Graph g = graph::testing::sample_graph();
    const auto r = deps::find_path(g, "package:app", "module:main.py", {}, 8);
    EXPECT_FALSE(r.found);
    EXPECT_TRUE(r.node_ids.empty());
    EXPECT_THROW(deps::find_path(g, "module:nope.py", "package:app", {}, 8), core::PvError);
}
