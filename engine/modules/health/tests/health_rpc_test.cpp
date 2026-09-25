#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/health/health.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_runtime(pv::session::Registry& reg);
void pv_register_health(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

namespace {

Json error_event(const std::string& span) {
    return Json{{"v", 1},           {"event_id", "e" + span}, {"trace_id", "t1"}, {"span_id", span},
                {"kind", "call"},   {"name", "is_valid"},     {"start_ns", 100},  {"file_path", "app/utils.py"},
                {"line", 9},        {"status", "error"},      {"error", {{"type", "ValueError"}, {"message", "bad"}, {"stack", ""}}}};
}

}  // namespace

TEST(HealthRpc, ErrorsBecomeHealthStates) {
    runtime::hub().reset_for_tests();
    health::tracker().reset_for_tests();
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_runtime(*env.reg);
    pv_register_health(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());

    env.call("runtime.ingest", Json{{"project_id", pid}, {"events", {error_event("s1"), error_event("s2")}}});
    const auto project = env.projects->get(pid);
    EXPECT_EQ(project->read([](const graph::Graph& g) { return g.node("function:app/utils.py#is_valid").health; }), core::Health::Error);
    EXPECT_EQ(project->read([](const graph::Graph& g) { return g.node("package:app").health; }), core::Health::Error);

    bool changed = false;
    for (const auto& [method, params] : env.notifier.items()) {
        if (method == "health.changed" && params["project_id"] == pid) changed = !params["changes"].empty();
    }
    EXPECT_TRUE(changed);

    const Json states = env.call("health.get", Json{{"project_id", pid}});
    EXPECT_EQ(states["states"]["function:app/utils.py#is_valid"]["state"], "error");
    EXPECT_EQ(states["states"]["function:app/utils.py#is_valid"]["errors"], 2);
    const Json one = env.call("health.get", Json{{"project_id", pid}, {"node_ids", {"function:app/utils.py#normalize"}}});
    EXPECT_EQ(one["states"]["function:app/utils.py#normalize"]["state"], "unknown");

    const Json config = env.call("health.config", Json{{"project_id", pid}, {"thresholds", {{"error_rate", 0.5}, {"warn_p95_ms", 200}}}});
    EXPECT_EQ(config["thresholds"]["error_rate"], 0.5);
    EXPECT_EQ(config["thresholds"]["warn_p95_ms"], 200);
    EXPECT_EQ(env.call("health.config", Json{{"project_id", pid}})["thresholds"]["window_ms"], 60000);
    EXPECT_THROW(env.call("health.config", Json{{"project_id", pid}, {"thresholds", {{"error_rate", 2}}}}), core::PvError);

    runtime::hub().reset_for_tests();
    health::tracker().reset_for_tests();
}
