#include <gtest/gtest.h>

#include <chrono>
#include <cstdio>
#include <thread>

#include "incr_fixture.hpp"
#include "pv/core/error.hpp"
#include "pv/incremental/incremental.hpp"
#include "pv/lang_python/python_adapter.hpp"

void pv_register_incremental(pv::session::Registry& reg);

using namespace pv;
using namespace pv::incremental::testing;

namespace {

int graph_changes(const session::TestEnv& env) {
    int n = 0;
    for (const auto& [method, params] : env.notifier.items()) {
        if (method == "graph.changed") ++n;
    }
    return n;
}

void wait_seeded(session::TestEnv& env, const std::string& pid) {
    for (int i = 0; i < 200 && !env.call("watch.status", {{"project_id", pid}})["seeded"].get<bool>(); ++i) {
        std::this_thread::sleep_for(std::chrono::milliseconds(25));
    }
}

}  // namespace

TEST(IncrNativeWatch, SavedFileUpdatesTheMapQuickly) {
    incremental::manager().reset_for_tests();
    TempDir dir;
    copy_fixture(dir);
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_incremental(*env.reg);
    const std::string pid = env.open_and_wait(dir.str());

    const auto started = env.call("watch.start", {{"project_id", pid}, {"mode", "native"}});
    EXPECT_EQ(started["mode"], "native");
    wait_seeded(env, pid);
    std::this_thread::sleep_for(std::chrono::milliseconds(100));  // let the OS watcher settle

    const int before = graph_changes(env);
    const auto t0 = std::chrono::steady_clock::now();
    replace_in_file(dir.path / "app" / "utils.py", "def normalize", "def normalize_text");
    int64_t ms = -1;
    for (int i = 0; i < 400; ++i) {
        if (graph_changes(env) > before) {
            ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - t0).count();
            break;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(5));
    }
    std::printf("[incremental] save -> graph.changed in %lld ms (target < 100 ms)\n", static_cast<long long>(ms));
    ASSERT_GE(ms, 0) << "no graph.changed after the save";
    EXPECT_LT(ms, 500);  // generous bound for slow CI machines; the product target is < 100 ms
    const bool renamed = env.projects->get(pid)->read(
        [](const graph::Graph& g) { return g.find_node("function:app/utils.py#normalize_text") != nullptr; });
    EXPECT_TRUE(renamed);
    env.call("watch.stop", {{"project_id", pid}});
}

TEST(IncrNativeWatch, NewFilesUseAFullCompare) {
    incremental::manager().reset_for_tests();
    TempDir dir;
    copy_fixture(dir);
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_incremental(*env.reg);
    const std::string pid = env.open_and_wait(dir.str());
    env.call("watch.start", {{"project_id", pid}});  // auto -> native on the dev platforms
    wait_seeded(env, pid);
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    write_text(dir.path / "app" / "fresh.py", "def brand_new():\n    return 1\n");
    bool found = false;
    for (int i = 0; i < 200 && !found; ++i) {
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
        found = env.projects->get(pid)->read([](const graph::Graph& g) { return g.find_node("function:app/fresh.py#brand_new") != nullptr; });
    }
    EXPECT_TRUE(found);

    stdfs::remove(dir.path / "app" / "fresh.py");
    bool gone = false;
    for (int i = 0; i < 200 && !gone; ++i) {
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
        gone = env.projects->get(pid)->read([](const graph::Graph& g) { return g.find_node("function:app/fresh.py#brand_new") == nullptr; });
    }
    EXPECT_TRUE(gone);
    env.call("watch.stop", {{"project_id", pid}});
}

TEST(IncrNativeWatch, PollModeAndBadMode) {
    incremental::manager().reset_for_tests();
    TempDir dir;
    copy_fixture(dir);
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_incremental(*env.reg);
    const std::string pid = env.open_and_wait(dir.str());
    EXPECT_EQ(env.call("watch.start", {{"project_id", pid}, {"mode", "poll"}})["mode"], "poll");
    // Switching the mode restarts the watch.
    EXPECT_EQ(env.call("watch.start", {{"project_id", pid}, {"mode", "native"}})["mode"], "native");
    EXPECT_THROW(env.call("watch.start", {{"project_id", pid}, {"mode", "sometimes"}}), core::PvError);
    env.call("watch.stop", {{"project_id", pid}});
    EXPECT_EQ(env.call("watch.status", {{"project_id", pid}})["mode"], "poll");
}
