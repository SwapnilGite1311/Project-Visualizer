#include <gtest/gtest.h>

#include "pv/health/health.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_runtime(pv::session::Registry& reg);
void pv_register_health(pv::session::Registry& reg);
void pv_register_rtsync(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

TEST(RtsyncRpc, LiveLevelView) {
    runtime::hub().reset_for_tests();
    health::tracker().reset_for_tests();
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_runtime(*env.reg);
    pv_register_health(*env.reg);
    pv_register_rtsync(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());
    const Json a{{"v", 1}, {"event_id", "a"}, {"trace_id", "t"}, {"span_id", "a"}, {"kind", "call"}, {"name", "main"},
                 {"start_ns", 1000}, {"file_path", "main.py"}, {"line", 8}};
    const Json b{{"v", 1}, {"event_id", "b"}, {"trace_id", "t"}, {"span_id", "b"}, {"parent_span_id", "a"}, {"kind", "call"},
                 {"name", "get_user"}, {"start_ns", 2000}, {"file_path", "app/services.py"}, {"line", 11}};
    env.call("runtime.ingest", Json{{"project_id", pid}, {"events", {a, b}}});

    const Json view = env.call("rtsync.level_view", Json{{"project_id", pid}});
    EXPECT_EQ(view["parent"]["id"], "project:");
    EXPECT_EQ(view["live"]["package:app"]["calls"], 1);
    EXPECT_EQ(view["live"]["package:app"]["health"], "ok");
    ASSERT_EQ(view["flows"].size(), 1u);
    EXPECT_EQ(view["flows"][0]["edge_id"], "agg|calls|module:main.py|package:app");

    const Json inside = env.call("rtsync.level_view", Json{{"project_id", pid}, {"parent_id", "package:app"}, {"window_ms", 1000}});
    EXPECT_EQ(inside["live"]["module:app/services.py"]["calls"], 1);
    runtime::hub().reset_for_tests();
    health::tracker().reset_for_tests();
}
