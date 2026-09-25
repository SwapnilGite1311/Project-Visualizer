#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/runtime/hub.hpp"
#include "pv/session/test_env.hpp"

void pv_register_runtime(pv::session::Registry& reg);
void pv_register_modtrace(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

namespace {

Json call(const std::string& span, const std::string& parent, const std::string& file, int line, int64_t start) {
    Json e{{"v", 1},           {"event_id", "e" + span}, {"trace_id", "t1"}, {"span_id", span}, {"kind", "call"},
           {"name", span},     {"start_ns", start},      {"duration_ns", 1000000}, {"file_path", file}, {"line", line}};
    if (!parent.empty()) e["parent_span_id"] = parent;
    return e;
}

}  // namespace

TEST(ModtraceRpc, BoundariesAndFollow) {
    runtime::hub().reset_for_tests();
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_runtime(*env.reg);
    pv_register_modtrace(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());
    env.call("runtime.ingest", Json{{"project_id", pid},
                                    {"events",
                                     {call("a", "", "app/api/routes.py", 7, 100), call("b", "a", "app/services.py", 11, 200),
                                      call("c", "b", "app/utils.py", 9, 300)}}});

    const Json b = env.call("modtrace.boundaries", Json{{"project_id", pid}});
    ASSERT_EQ(b["crossings"].size(), 2u);
    EXPECT_EQ(b["crossings"][0]["count"], 1);
    EXPECT_DOUBLE_EQ(b["crossings"][0]["avg_ms"].get<double>(), 1.0);

    const Json f = env.call("modtrace.follow", Json{{"project_id", pid}, {"trace_id", "t1"}, {"direction", "forward"}});
    ASSERT_EQ(f["hops"].size(), 2u);
    EXPECT_EQ(f["hops"][0]["from_id"], "module:app/api/routes.py");
    EXPECT_EQ(f["hops"][1]["to_id"], "module:app/utils.py");
    runtime::hub().reset_for_tests();
}
