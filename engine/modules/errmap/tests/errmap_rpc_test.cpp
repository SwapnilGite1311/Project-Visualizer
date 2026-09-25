#include <gtest/gtest.h>

#include "pv/errmap/store.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"
#include "samples.hpp"

void pv_register_runtime(pv::session::Registry& reg);
void pv_register_errmap(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

namespace {

Json runtime_error(const std::string& span, const std::string& stack = "") {
    return Json{{"v", 1},           {"event_id", "e" + span}, {"trace_id", "t1"}, {"span_id", span},
                {"kind", "call"},   {"name", "is_valid"},     {"start_ns", 100},  {"file_path", "app/utils.py"},
                {"line", 9},        {"status", "error"},      {"error", {{"type", "ValueError"}, {"message", "bad id"}, {"stack", stack}}}};
}

}  // namespace

TEST(ErrmapRpc, PastedAndRuntimeErrors) {
    runtime::hub().reset_for_tests();
    errmap::store().reset_for_tests();
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_runtime(*env.reg);
    pv_register_errmap(*env.reg);
    const std::string root = session::pyproj_small_path();
    const std::string pid = env.open_and_wait(root);

    const Json mapped = env.call("errors.map_stack", Json{{"project_id", pid}, {"text", errmap::testing::python_trace(root)}});
    EXPECT_EQ(mapped["language"], "python");
    ASSERT_EQ(mapped["frames"].size(), 3u);
    EXPECT_EQ(mapped["frames"][2]["node_id"], "function:app/utils.py#is_valid");
    EXPECT_EQ(mapped["frames"][2]["is_origin"], true);

    env.call("runtime.ingest", Json{{"project_id", pid}, {"events", {runtime_error("s1"), runtime_error("s2")}}});
    env.call("runtime.ingest", Json{{"project_id", pid}, {"events", {runtime_error("s3", errmap::testing::python_trace(root))}}});
    const Json list = env.call("errors.list", Json{{"project_id", pid}});
    ASSERT_EQ(list["errors"].size(), 2u);
    Json runtime_record;
    for (const Json& r : list["errors"]) {
        if (r["source"] == "runtime") runtime_record = r;
    }
    EXPECT_EQ(runtime_record["count"], 3);
    EXPECT_EQ(runtime_record["origin_node_id"], "function:app/utils.py#is_valid");
    EXPECT_EQ(runtime_record["language"], "python");  // first seen without a stack, upgraded by the one with a stack
    EXPECT_EQ(runtime_record["frames"].size(), 3u);

    env.call("errors.clear", Json{{"project_id", pid}, {"error_id", mapped["error_id"]}});
    EXPECT_EQ(env.call("errors.list", Json{{"project_id", pid}})["errors"].size(), 1u);
    env.call("errors.clear", Json{{"project_id", pid}});
    EXPECT_TRUE(env.call("errors.list", Json{{"project_id", pid}})["errors"].empty());
    runtime::hub().reset_for_tests();
    errmap::store().reset_for_tests();
}
