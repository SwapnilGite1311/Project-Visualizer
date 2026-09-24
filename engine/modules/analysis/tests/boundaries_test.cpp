#include <gtest/gtest.h>

#include "analysis_fixture.hpp"

using namespace pv;
using Json = nlohmann::json;

TEST(AnalysisBoundaries, Fixture) {
    analysis::testing::Fixture f;
    const Json p = f.read([](const graph::Graph& g) { return analysis::build_boundaries(g)["packages"]; });
    ASSERT_EQ(p.size(), 2u);
    EXPECT_EQ(p[0]["node_id"], "package:app");
    EXPECT_EQ(p[0]["internal_edges"], 14);
    EXPECT_EQ(p[0]["outgoing_edges"], 0);
    EXPECT_EQ(p[0]["incoming_edges"], 2);
    EXPECT_DOUBLE_EQ(p[0]["instability"].get<double>(), 0.0);
    EXPECT_EQ(p[1]["node_id"], "package:app/api");
    EXPECT_EQ(p[1]["internal_edges"], 0);
    EXPECT_EQ(p[1]["outgoing_edges"], 4);
    EXPECT_EQ(p[1]["incoming_edges"], 0);
    EXPECT_DOUBLE_EQ(p[1]["instability"].get<double>(), 1.0);
}
