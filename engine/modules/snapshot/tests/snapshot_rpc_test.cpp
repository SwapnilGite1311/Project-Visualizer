#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_snapshot(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

TEST(SnapshotRpc, ExportThenLoadAsNewProject) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_snapshot(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());

    const Json s = env.call("snapshot.export", Json{{"project_id", pid}});
    const Json loaded = env.call("snapshot.load", Json{{"snapshot", s}});
    const std::string copy = loaded["project_id"];
    EXPECT_NE(copy, pid);
    EXPECT_EQ(copy, "p2");
    const auto project = env.projects->get(copy);
    EXPECT_EQ(project->state(), session::ProjectState::Ready);
    EXPECT_EQ(project->read([](const graph::Graph& g) { return g.node_count(); }), 25u);
}
