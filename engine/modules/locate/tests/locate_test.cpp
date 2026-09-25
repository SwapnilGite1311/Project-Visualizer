#include <gtest/gtest.h>

#include <filesystem>
#ifdef _WIN32
#define NOMINMAX
#include <windows.h>
#endif

#include "pv/lang_python/python_adapter.hpp"
#include "pv/core/paths.hpp"
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

// A folder written with Windows short names (or through a link) is the same folder.
TEST(Locate, ShortAndLongNamesOfTheSameFolder) {
#ifdef _WIN32
    const std::string root = session::pyproj_small_path();
    const std::wstring wide = std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(root.data()), root.size())).wstring();
    std::wstring shortened(MAX_PATH, L'\0');
    const DWORD n = GetShortPathNameW(wide.c_str(), shortened.data(), MAX_PATH);
    if (n == 0 || n >= MAX_PATH) GTEST_SKIP() << "no short name for the fixture";
    shortened.resize(n);
    const std::u8string u8 = std::filesystem::path(shortened).generic_u8string();
    const std::string short_root(reinterpret_cast<const char*>(u8.data()), u8.size());
    if (core::normalize_path(short_root) == core::normalize_path(root)) GTEST_SKIP() << "8.3 names are off on this volume";
    EXPECT_EQ(locate::to_project_relative(root, short_root + "/app/utils.py"), "app/utils.py");
    EXPECT_EQ(locate::to_project_relative(short_root, root + "/app/utils.py"), "app/utils.py");
#else
    GTEST_SKIP() << "Windows only";
#endif
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
