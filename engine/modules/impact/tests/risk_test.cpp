#include <gtest/gtest.h>

#include "../../graph/tests/sample_graph.hpp"
#include "pv/impact/impact.hpp"

using namespace pv;
using namespace pv::impact;

TEST(ImpactRisk, Scores) {
    const graph::Graph g = pv::graph::testing::sample_graph();
    const Risk method = analyze_impact(g, "method:app/a.py#C.m", 5).risk;
    EXPECT_EQ(method.score, 26);
    EXPECT_EQ(method.level, "medium");
    EXPECT_EQ(method.factors,
              (std::vector<std::string>{"2 direct dependents", "0 indirect dependents", "spans 2 packages"}));
    const Risk module = analyze_impact(g, "module:app/a.py", 5).risk;
    EXPECT_EQ(module.score, 16);
    EXPECT_EQ(module.level, "low");
    const Risk none = analyze_impact(g, "function:main.py#main", 5).risk;
    EXPECT_EQ(none.score, 0);
    EXPECT_EQ(none.level, "low");
    EXPECT_EQ(none.factors,
              (std::vector<std::string>{"0 direct dependents", "0 indirect dependents", "spans 0 packages"}));
}
