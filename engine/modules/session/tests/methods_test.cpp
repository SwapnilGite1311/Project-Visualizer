#include <gtest/gtest.h>

#include <chrono>
#include <thread>

#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_session(pv::session::Registry& reg);

using namespace pv;
using namespace pv::session;
using rpc::Json;

TEST(SessionMethods, PingLangOpenStatus) {
    TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_session(*env.reg);
    EXPECT_EQ(env.call("engine.ping", Json::object())["version"], "0.1.0");
    EXPECT_EQ(env.call("engine.ping", Json::object())["protocol"], 1);
    EXPECT_EQ(env.call("lang.list", Json::object())["languages"][0]["id"], "python");

    const Json opened = env.call("project.open", Json{{"root_path", pyproj_small_path()}});
    EXPECT_EQ(opened["project_id"], "p1");
    Json status;
    for (int i = 0; i < 2000; ++i) {
        status = env.call("project.status", Json{{"project_id", "p1"}});
        if (status["state"] == "ready" || status["state"] == "error") break;
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    EXPECT_EQ(status["state"], "ready");
    EXPECT_EQ(status["files_total"], 8);
    EXPECT_EQ(status["error_message"], "");
    EXPECT_EQ(env.call("project.close", Json{{"project_id", "p1"}})["ok"], true);
}

TEST(SessionMethods, Errors) {
    TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_session(*env.reg);
    try {
        env.call("project.open", Json{{"root_path", "C:/definitely/not/here"}});
        FAIL() << "expected Io";
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::Io);
    }
    try {
        env.call("project.status", Json{{"project_id", "nope"}});
        FAIL() << "expected ProjectNotFound";
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::ProjectNotFound);
    }
}
