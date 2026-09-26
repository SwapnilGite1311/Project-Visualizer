#include <gtest/gtest.h>

#include "pv/sim/replay.hpp"
#include "sim_fixture.hpp"

using namespace pv;
using namespace pv::sim;
using namespace pv::sim::testing;

TEST(SimFlows, FlowsAtALevelCountSimulatedFailures) {
    Fixture f;
    graph::Graph g = f.graph();
    Sandbox sb;
    const auto before = sim_flows(sb, g, three_traces(), "package:app")["flows"];
    ASSERT_EQ(before.size(), 1u);
    EXPECT_EQ(before[0]["source_id"], "module:app/services.py");
    EXPECT_EQ(before[0]["target_id"], "module:app/utils.py");
    EXPECT_EQ(before[0]["count"], 3);
    EXPECT_EQ(before[0]["failed"], 0);

    apply_change(sb, g, change_from_json({{"kind", "delete_node"}, {"node_id", kIsValid}}));
    const auto after = sim_flows(sb, g, three_traces(), "package:app")["flows"];
    EXPECT_EQ(after[0]["failed"], 3);
    // At the top level both ends are inside package:app: no flow between different elements.
    EXPECT_TRUE(sim_flows(sb, g, three_traces(), "project:")["flows"].empty());
}
