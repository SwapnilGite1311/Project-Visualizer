#include <gtest/gtest.h>

#include "../../graph/tests/sample_graph.hpp"
#include "pv/core/error.hpp"
#include "pv/impact/impact.hpp"

using namespace pv;
using namespace pv::impact;

TEST(ImpactBfs, MethodImpact) {
    const graph::Graph g = pv::graph::testing::sample_graph();
    const ImpactResult r = analyze_impact(g, "method:app/a.py#C.m", 5);
    ASSERT_EQ(r.affected.size(), 2u);
    EXPECT_EQ(r.affected[0].node_id, "function:app/a.py#f");
    EXPECT_EQ(r.affected[0].distance, 1);
    EXPECT_EQ(r.affected[0].via, core::EdgeKind::Calls);
    EXPECT_EQ(r.affected[0].from_id, "method:app/a.py#C.m");
    EXPECT_EQ(r.affected[1].node_id, "function:main.py#main");
    EXPECT_EQ(r.affected[1].distance, 1);
    EXPECT_EQ(r.affected[1].ancestor_ids,
              (std::vector<std::string>{"project:", "module:main.py", "function:main.py#main"}));
}

TEST(ImpactBfs, ModuleImpact) {
    const graph::Graph g = pv::graph::testing::sample_graph();
    const ImpactResult r = analyze_impact(g, "module:app/a.py", 5);
    ASSERT_EQ(r.affected.size(), 2u);
    EXPECT_EQ(r.affected[0].node_id, "function:main.py#main");
    EXPECT_EQ(r.affected[0].via, core::EdgeKind::Calls);
    EXPECT_EQ(r.affected[1].node_id, "module:main.py");
    EXPECT_EQ(r.affected[1].via, core::EdgeKind::Imports);
    EXPECT_EQ(r.affected[1].distance, 1);
}

TEST(ImpactBfs, UnknownNodeThrows) {
    EXPECT_THROW(analyze_impact(pv::graph::testing::sample_graph(), "function:nope.py#x", 5), core::PvError);
}
