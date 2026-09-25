#include <gtest/gtest.h>

#include <filesystem>
#include <fstream>

#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_motion(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

namespace {

int error_code(session::TestEnv& env, const std::string& method, const Json& params) {
    try {
        env.call(method, params);
    } catch (const core::PvError& e) {
        return e.code();
    }
    return 0;
}

std::string four_step_trace() {
    const std::filesystem::path path = std::filesystem::temp_directory_path() / "pv_motion_rpc_test.jsonl";
    std::ofstream out(path, std::ios::binary);
    out << R"({"v":1,"seq":0,"kind":"start","file":"","line":0,"func":"","depth":0,"t_ns":0,"argv":["main.py"]})" << "\n";
    out << R"({"v":1,"seq":1,"kind":"call","file":"main.py","line":7,"func":"main","depth":0,"t_ns":1})" << "\n";
    out << R"({"v":1,"seq":2,"kind":"line","file":"main.py","line":8,"func":"main","depth":0,"t_ns":2})" << "\n";
    out << R"({"v":1,"seq":3,"kind":"line","file":"main.py","line":9,"func":"main","depth":0,"t_ns":3,"locals":{"service":"<obj>"}})" << "\n";
    out << R"({"v":1,"seq":4,"kind":"return","file":"main.py","line":11,"func":"main","depth":0,"t_ns":4,"value":"0"})" << "\n";
    out << R"({"v":1,"seq":5,"kind":"end","file":"","line":0,"func":"","depth":0,"t_ns":5,"exit_code":0,"events":6,"truncated":false})" << "\n";
    return path.generic_string();
}

}  // namespace

TEST(MotionRpc, Body) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_motion(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());

    const Json m = env.call("motion.body", Json{{"project_id", pid}, {"node_id", "method:app/services.py#UserService.get_user"}});
    EXPECT_EQ(m["file_path"], "app/services.py");
    EXPECT_EQ(m["start_line"], 8);
    ASSERT_EQ(m["blocks"].size(), 4u);
    EXPECT_TRUE(m["blocks"][0]["parent"].is_null());
    EXPECT_EQ(m["blocks"][1]["parent"], "b1");

    const Json c = env.call("motion.body", Json{{"project_id", pid}, {"node_id", "class:app/models.py#User"}});
    ASSERT_EQ(c["blocks"].size(), 2u);
    EXPECT_EQ(c["blocks"][0]["kind"], "def");

    const Json mod = env.call("motion.body", Json{{"project_id", pid}, {"node_id", "module:main.py"}});
    EXPECT_EQ(mod["start_line"], 1);
    EXPECT_EQ(mod["blocks"].size(), 6u);

    EXPECT_EQ(error_code(env, "motion.body", Json{{"project_id", pid}, {"node_id", "package:app"}}), core::err::InvalidParams);
    EXPECT_EQ(error_code(env, "motion.body", Json{{"project_id", pid}, {"node_id", "function:nope.py#x"}}),
              core::err::NodeNotFound);
}

TEST(MotionRpc, Traces) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_motion(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());

    const Json loaded = env.call("motion.load_trace", Json{{"project_id", pid}, {"path", four_step_trace()}});
    EXPECT_EQ(loaded["steps_total"], 4);
    EXPECT_EQ(loaded["exit_code"], 0);
    EXPECT_TRUE(loaded["last_exception"].is_null());
    ASSERT_EQ(loaded["functions"].size(), 1u);
    EXPECT_EQ(loaded["functions"][0]["node_id"], "function:main.py#main");
    const std::string tid = loaded["trace_id"];

    const Json page = env.call("motion.steps", Json{{"trace_id", tid}, {"from", 1}, {"count", 2}});
    EXPECT_EQ(page["total"], 4);
    ASSERT_EQ(page["steps"].size(), 2u);
    EXPECT_EQ(page["steps"][0]["i"], 1);
    EXPECT_EQ(page["steps"][1]["i"], 2);
    EXPECT_EQ(page["steps"][1]["locals"]["service"], "<obj>");

    EXPECT_EQ(error_code(env, "motion.steps", Json{{"trace_id", "t999"}}), core::err::InvalidParams);
    EXPECT_EQ(error_code(env, "motion.load_trace", Json{{"project_id", pid}, {"path", "C:/no/such/trace.jsonl"}}),
              core::err::Io);
    EXPECT_EQ(env.call("motion.unload", Json{{"trace_id", tid}})["removed"], true);
    EXPECT_EQ(env.call("motion.unload", Json{{"trace_id", tid}})["removed"], false);
}
