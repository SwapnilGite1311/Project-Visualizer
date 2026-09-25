#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/locate/locate.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

TEST(Locate, ProjectRelativePaths) {
    EXPECT_EQ(locate::to_project_relative("C:/code/p", "C:/code/p/app/a.py"), "app/a.py");
    EXPECT_EQ(locate::to_project_relative("C:/code/p", "C:\\code\\p\\app\\a.py"), "app/a.py");
    EXPECT_EQ(locate::to_project_relative("C:/code/p", "app\\a.py"), "app/a.py");
    EXPECT_EQ(locate::to_project_relative("/home/u/p", "/home/u/p/main.py"), "main.py");
    EXPECT_EQ(locate::to_project_relative("C:/code/p", "D:/other/a.py"), std::nullopt);
}

TEST(Locate, NodesInTheFixture) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));
    project->read([](const graph::Graph& g) {
        ASSERT_NE(locate::node_at(g, "app/utils.py", 9), nullptr);
        EXPECT_EQ(locate::node_at(g, "app/utils.py", 9)->id, "function:app/utils.py#is_valid");
        EXPECT_EQ(locate::node_at(g, "app/utils.py", 1)->id, "module:app/utils.py");
        EXPECT_EQ(locate::node_at(g, "nope.py", 1), nullptr);
        const auto nodes = locate::file_nodes(g, "app/utils.py");
        ASSERT_EQ(nodes.size(), 3u);
        EXPECT_EQ(nodes[0]->id, "module:app/utils.py");
        EXPECT_EQ(nodes[1]->id, "function:app/utils.py#normalize");
        EXPECT_EQ(nodes[2]->id, "function:app/utils.py#is_valid");
    });
}
