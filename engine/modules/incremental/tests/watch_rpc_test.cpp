#include <gtest/gtest.h>

#include <thread>

#include "incr_fixture.hpp"
#include "pv/core/error.hpp"
#include "pv/incremental/incremental.hpp"
#include "pv/lang_python/python_adapter.hpp"

void pv_register_incremental(pv::session::Registry& reg);

using namespace pv;
using namespace pv::incremental::testing;

TEST(WatchRpc, NewFilesAppearWhileWatching) {
    incremental::manager().reset_for_tests();
    TempDir dir;
    copy_fixture(dir);
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_incremental(*env.reg);
    const std::string pid = env.open_and_wait(dir.str());

    const auto started = env.call("watch.start", {{"project_id", pid}, {"interval_ms", 100}});  // clamped to 250
    EXPECT_EQ(started["watching"], true);
    EXPECT_EQ(started["interval_ms"], 250);

    // Wait until the first scan is recorded, then add a file.
    for (int i = 0; i < 100 && !env.call("watch.status", {{"project_id", pid}})["seeded"].get<bool>(); ++i) {
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }
    write_text(dir.path / "app" / "extra.py", "def shiny():\n    return 42\n");
    bool found = false;
    for (int i = 0; i < 100 && !found; ++i) {
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
        found = env.projects->get(pid)->read([](const graph::Graph& g) { return g.find_node("function:app/extra.py#shiny") != nullptr; });
    }
    EXPECT_TRUE(found);
    const auto status = env.call("watch.status", {{"project_id", pid}});
    EXPECT_GT(status["last_change_ms"].get<int64_t>(), 0);

    const auto stopped = env.call("watch.stop", {{"project_id", pid}});
    EXPECT_EQ(stopped["watching"], false);
    EXPECT_THROW(env.call("watch.status", {{"project_id", "nope"}}), core::PvError);

    // engine.shutdown stops watchers first.
    env.call("watch.start", {{"project_id", pid}});
    env.reg->request_shutdown();
    EXPECT_EQ(env.call("watch.status", {{"project_id", pid}})["watching"], false);
    incremental::manager().reset_for_tests();
}
