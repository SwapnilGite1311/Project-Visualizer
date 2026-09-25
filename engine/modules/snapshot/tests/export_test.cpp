#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"
#include "pv/snapshot/snapshot.hpp"

using namespace pv;

TEST(SnapshotExport, WholeGraphWithoutSource) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));
    const nlohmann::json s = project->read([](const graph::Graph& g) { return snapshot::export_snapshot(g); });
    EXPECT_EQ(s["format"], "pv-snapshot-1");
    EXPECT_EQ(s["label"], "pyproj_small");
    EXPECT_FALSE(s["engine_version"].get<std::string>().empty());
    EXPECT_EQ(s["nodes"].size(), 25u);
    EXPECT_EQ(s["edges"].size(), 19u);
    EXPECT_EQ(s["nodes"][0]["id"], "class:app/models.py#Base");  // sorted by id
    EXPECT_EQ(s.dump().find("def "), std::string::npos);        // no source code inside
}
