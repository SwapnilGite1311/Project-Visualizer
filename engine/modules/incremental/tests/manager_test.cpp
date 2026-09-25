#include <gtest/gtest.h>

#include "incr_fixture.hpp"
#include "pv/incremental/incremental.hpp"
#include "pv/lang_python/python_adapter.hpp"

using namespace pv;
using namespace pv::incremental::testing;

TEST(IncrManager, ApplyChangesKeepsTheGraphInSync) {
    incremental::manager().reset_for_tests();
    TempDir dir;
    copy_fixture(dir);
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(dir.str()));
    std::vector<std::string> heard;
    incremental::manager().add_listener([&](const std::string&, const std::vector<std::string>& files, const incremental::GraphDiff&) {
        heard = files;
    });

    project->write([](graph::Graph& g) {
        g.find_node_mut("function:app/utils.py#normalize")->health = core::Health::Error;
        return 0;
    });
    incremental::manager().seed(*project, env.adapters);
    EXPECT_TRUE(incremental::manager().status(project->id())["seeded"].get<bool>());

    // Rename is_valid to is_ok everywhere.
    for (const char* file : {"app/utils.py", "app/services.py", "app/api/routes.py"}) {
        replace_in_file(dir.path / file, "is_valid", "is_ok");
    }
    incremental::ChangeSet changes;
    changes.modified = {"app/api/routes.py", "app/services.py", "app/utils.py"};
    const auto files = incremental::manager().apply_changes(*project, env.adapters, env.notifier, changes);
    EXPECT_EQ(files, changes.modified);
    EXPECT_EQ(heard, changes.modified);

    project->read([](const graph::Graph& g) {
        EXPECT_NE(g.find_node("function:app/utils.py#is_ok"), nullptr);
        EXPECT_EQ(g.find_node("function:app/utils.py#is_valid"), nullptr);
        EXPECT_EQ(g.node("function:app/utils.py#normalize").health, core::Health::Error);  // kept
        return 0;
    });
    bool notified = false;
    for (const auto& [method, params] : env.notifier.items()) {
        if (method != "graph.changed") continue;
        notified = true;
        EXPECT_EQ(params["project_id"], project->id());
        EXPECT_NE(std::find(params["nodes_added"].begin(), params["nodes_added"].end(), "function:app/utils.py#is_ok"),
                  params["nodes_added"].end());
        EXPECT_NE(std::find(params["nodes_removed"].begin(), params["nodes_removed"].end(), "function:app/utils.py#is_valid"),
                  params["nodes_removed"].end());
    }
    EXPECT_TRUE(notified);

    // Deleting a file removes its elements.
    stdfs::remove(dir.path / "broken.py");
    incremental::ChangeSet removed;
    removed.removed = {"broken.py"};
    incremental::manager().apply_changes(*project, env.adapters, env.notifier, removed);
    project->read([](const graph::Graph& g) {
        EXPECT_EQ(g.find_node("module:broken.py"), nullptr);
        return 0;
    });
    incremental::manager().reset_for_tests();
}
