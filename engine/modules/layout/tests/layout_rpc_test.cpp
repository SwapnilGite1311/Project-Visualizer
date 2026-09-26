#include <gtest/gtest.h>

#include <cstdlib>
#include <filesystem>
#include <random>

#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_layout(pv::session::Registry& reg);

using namespace pv;

namespace {

struct CacheDir {
    std::filesystem::path dir;
    CacheDir() {
        std::random_device rd;
        dir = std::filesystem::temp_directory_path() / ("pv-layout-cache-" + std::to_string(rd()));
        set(dir.generic_string());
    }
    ~CacheDir() { set(""); }
    static void set(const std::string& v) {
#ifdef _WIN32
        _putenv_s("PV_CACHE_DIR", v.c_str());
#else
        if (v.empty()) unsetenv("PV_CACHE_DIR");
        else setenv("PV_CACHE_DIR", v.c_str(), 1);
#endif
    }
};

}  // namespace

TEST(LayoutRpc, ComputesAndCaches) {
    CacheDir cache;
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_layout(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());

    const auto first = env.call("layout.compute", {{"project_id", pid}, {"mode", "2d"}});
    EXPECT_EQ(first["cached"], false);
    EXPECT_FALSE(first["positions"].empty());
    EXPECT_TRUE(first["positions"].contains("package:app"));
    EXPECT_FALSE(first["positions"]["package:app"].contains("z"));
    const auto again = env.call("layout.compute", {{"project_id", pid}, {"mode", "2d"}});
    EXPECT_EQ(again["cached"], true);
    EXPECT_EQ(again["graph_version"], first["graph_version"]);
    EXPECT_EQ(again["positions"], first["positions"]);

    const auto inner = env.call("layout.compute", {{"project_id", pid}, {"parent_id", "package:app"}, {"mode", "3d"}});
    EXPECT_EQ(inner["cached"], false);
    EXPECT_NE(inner["graph_version"], first["graph_version"]);
    for (const auto& [id, p] : inner["positions"].items()) EXPECT_TRUE(p.contains("z")) << id;
}

TEST(LayoutRpc, ChangedGraphGetsANewVersion) {
    CacheDir cache;
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_layout(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());
    const auto before = env.call("layout.compute", {{"project_id", pid}, {"mode", "2d"}, {"rankdir", "LR"}});
    env.projects->get(pid)->write([](graph::Graph& g) {
        core::Node extra;
        extra.id = "module:extra.py";
        extra.kind = core::NodeKind::Module;
        extra.name = "extra.py";
        extra.file_path = "extra.py";
        extra.level = 2;
        extra.parent_id = "project:";
        g.add_node(extra);
        return 0;
    });
    const auto after = env.call("layout.compute", {{"project_id", pid}, {"mode", "2d"}, {"rankdir", "LR"}});
    EXPECT_NE(after["graph_version"], before["graph_version"]);
    EXPECT_EQ(after["cached"], false);
    EXPECT_TRUE(after["positions"].contains("module:extra.py"));
}

TEST(LayoutRpc, BadParams) {
    CacheDir cache;
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_layout(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());
    EXPECT_THROW(env.call("layout.compute", {{"project_id", pid}, {"mode", "4d"}}), core::PvError);
    EXPECT_THROW(env.call("layout.compute", {{"project_id", pid}, {"mode", "2d"}, {"rankdir", "RL"}}), core::PvError);
}
