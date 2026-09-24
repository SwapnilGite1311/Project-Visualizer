#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;
using namespace pv::session;

TEST(SessionManager, OpenLoadNotify) {
    TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const std::string id = env.projects->open(pyproj_small_path(), {});
    EXPECT_EQ(id, "p1");
    EXPECT_EQ(env.projects->open(pyproj_small_path(), {}), "p1");
    ASSERT_TRUE(env.projects->wait_until_settled("p1", 10000));
    EXPECT_EQ(env.projects->get("p1")->read([](const graph::Graph& g) { return g.node_count(); }), 25u);

    std::vector<std::string> states;
    for (const auto& [method, params] : env.notifier.items()) {
        if (method != "project.progress") continue;
        const std::string state = params["state"];
        if (states.empty() || states.back() != state) states.push_back(state);
    }
    EXPECT_EQ(states, (std::vector<std::string>{"scanning", "parsing", "linking", "ready"}));
}

TEST(SessionManager, MissingFolderAndLookups) {
    TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const std::string id = env.projects->open("C:/definitely/not/here", {});
    EXPECT_FALSE(env.projects->wait_until_settled(id, 10000));
    EXPECT_EQ(env.projects->get(id)->state(), ProjectState::Error);
    EXPECT_NE(env.projects->get(id)->error_message().find("folder not found"), std::string::npos);
    try {
        env.projects->get("nope");
        FAIL() << "expected ProjectNotFound";
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::ProjectNotFound);
    }
    env.projects->close(id);
    EXPECT_TRUE(env.projects->ids().empty());
}

TEST(SessionManager, Adopt) {
    TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    graph::Graph g;
    core::Node a;
    a.id = "project:";
    a.kind = core::NodeKind::Project;
    core::Node b;
    b.id = "module:a.py";
    b.kind = core::NodeKind::Module;
    b.parent_id = "project:";
    g.add_node(a);
    g.add_node(b);
    const std::string id = env.projects->adopt("demo", std::move(g));
    const auto project = env.projects->get_ready(id);
    EXPECT_EQ(project->root_path(), "snapshot:demo");
    EXPECT_EQ(project->read([](const graph::Graph& graph) { return graph.node_count(); }), 2u);
    EXPECT_EQ(project->files_total(), 1);
}
