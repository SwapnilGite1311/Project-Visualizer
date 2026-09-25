#include <chrono>
#include <gtest/gtest.h>

#include "runtime_fixture.hpp"

void pv_register_runtime(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

TEST(RuntimeRpc, IngestStatusTraceAndClear) {
    runtime::testing::Fixture f;
    pv_register_runtime(*f.env.reg);
    const std::string pid = f.project->id();
    const Json good{{"v", 1},          {"event_id", "e1"}, {"trace_id", "t1"},       {"span_id", "s1"}, {"kind", "call"},
                    {"name", "is_valid"}, {"start_ns", 100}, {"file_path", "app/utils.py"}, {"line", 9}, {"service", "demo"}};
    const Json bad{{"v", 1}, {"kind", "call"}};

    const Json r = f.env.call("runtime.ingest", Json{{"project_id", pid}, {"events", {good, bad}}});
    EXPECT_EQ(r, (Json{{"accepted", 1}, {"mapped", 1}, {"dropped", 1}}));

    const Json status = f.env.call("runtime.status", Json{{"project_id", pid}});
    EXPECT_EQ(status["events_total"], 1);
    EXPECT_EQ(status["active"], true);
    EXPECT_EQ(status["services"], Json{"demo"});
    const int64_t wall_now =
        std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    EXPECT_NEAR(static_cast<double>(status["last_event_ms"].get<int64_t>()), static_cast<double>(wall_now), 5000.0);  // Unix ms

    const Json trace = f.env.call("runtime.trace", Json{{"project_id", pid}, {"trace_id", "t1"}});
    ASSERT_EQ(trace["steps"].size(), 1u);
    EXPECT_EQ(trace["steps"][0]["node_id"], "function:app/utils.py#is_valid");
    EXPECT_TRUE(trace["steps"][0]["parent_span_id"].is_null());

    const Json recent = f.env.call("runtime.recent_traces", Json{{"project_id", pid}});
    ASSERT_EQ(recent["traces"].size(), 1u);
    EXPECT_EQ(recent["traces"][0]["root_name"], "is_valid");

    EXPECT_EQ(f.env.call("runtime.clear", Json{{"project_id", pid}}), (Json{{"ok", true}}));
    EXPECT_EQ(f.env.call("runtime.status", Json{{"project_id", pid}})["events_total"], 0);
}
