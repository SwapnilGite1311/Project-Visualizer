#include <gtest/gtest.h>

#include <algorithm>

#include "pv/sim/replay.hpp"
#include "sim_fixture.hpp"

using namespace pv;
using namespace pv::sim;
using namespace pv::sim::testing;

namespace {

const nlohmann::json* effect_of(const nlohmann::json& run, const std::string& id) {
    for (const auto& e : run["node_effects"]) {
        if (e["node_id"] == id) return &e;
    }
    return nullptr;
}

bool contains(const nlohmann::json& list, const std::string& id) {
    return std::find(list.begin(), list.end(), id) != list.end();
}

}  // namespace

TEST(SimReplay, DeletingACalleeBreaksItsCallers) {
    Fixture f;
    const graph::Graph g = f.graph();
    Sandbox sb;
    graph::Graph copy = g;
    apply_change(sb, copy, change_from_json({{"kind", "delete_node"}, {"node_id", kIsValid}}));
    const auto run = run_replay(sb, copy, three_traces(), 500);
    EXPECT_EQ(run["mode"], "replay");
    EXPECT_EQ(run["traces_total"], 3);
    EXPECT_EQ(run["traces_failed_real"], 0);
    EXPECT_EQ(run["traces_failed_sim"], 3);
    EXPECT_EQ((*effect_of(run, kGetUser))["failures_sim"], 3);
    EXPECT_TRUE(contains(run["broken_node_ids"], kGetUser));
    EXPECT_TRUE(contains(run["broken_node_ids"], kIsValid));
}

TEST(SimReplay, SlowerCalleeSlowsTheTrace) {
    Fixture f;
    graph::Graph g = f.graph();
    Sandbox sb;
    apply_change(sb, g, change_from_json({{"kind", "set_latency"}, {"node_id", kIsValid}, {"factor", 3}}));
    const auto run = run_replay(sb, g, three_traces(), 500);
    EXPECT_DOUBLE_EQ(run["latency_p95_real_ms"].get<double>(), 10);
    EXPECT_DOUBLE_EQ(run["latency_p95_sim_ms"].get<double>(), 14);  // 10 + (6 - 2)
    EXPECT_DOUBLE_EQ((*effect_of(run, kIsValid))["p95_sim_ms"].get<double>(), 6);
    EXPECT_EQ(run["traces_failed_sim"], 0);
}

TEST(SimReplay, ErrorRateAndLimitAndStatic) {
    Fixture f;
    graph::Graph g = f.graph();
    Sandbox sb;
    apply_change(sb, g, change_from_json({{"kind", "set_error_rate"}, {"node_id", kIsValid}, {"rate", 1.0}}));
    EXPECT_EQ(run_replay(sb, g, three_traces(), 500)["traces_failed_sim"], 3);
    EXPECT_EQ(run_replay(sb, g, three_traces(), 2)["traces_total"], 2);  // the newest two

    Sandbox deleted;
    apply_change(deleted, g, change_from_json({{"kind", "delete_node"}, {"node_id", kIsValid}}));
    const auto st = run_static(deleted, g);
    EXPECT_EQ(st["mode"], "static");
    EXPECT_TRUE(contains(st["broken_node_ids"], kGetUser));
}

TEST(SimReplay, RemovedModuleEdgeBreaksCallsAcrossIt) {
    Fixture f;
    graph::Graph g = f.graph();
    Sandbox sb;
    apply_change(sb, g, change_from_json({{"kind", "remove_edge"}, {"source_id", "module:app/services.py"}, {"target_id", "module:app/utils.py"}}));
    const auto run = run_replay(sb, g, three_traces(), 500);
    EXPECT_EQ(run["traces_failed_sim"], 3);
}
