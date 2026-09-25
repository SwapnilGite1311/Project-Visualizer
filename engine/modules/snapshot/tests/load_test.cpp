#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/graph/level_view.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"
#include "pv/snapshot/snapshot.hpp"

using namespace pv;

TEST(SnapshotLoad, RoundTrip) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));
    const nlohmann::json s = project->read([](const graph::Graph& g) { return snapshot::export_snapshot(g); });

    const graph::Graph g = snapshot::graph_from_snapshot(s);
    EXPECT_EQ(g.node_count(), 25u);
    EXPECT_EQ(g.edge_count(), 19u);
    EXPECT_EQ(graph::build_level_view(g, "project:").nodes.size(), 4u);
    EXPECT_EQ(g.node("method:app/services.py#UserService.get_user").span.start_line, 8);
}

TEST(SnapshotLoad, RejectsOtherFormats) {
    try {
        snapshot::graph_from_snapshot(nlohmann::json{{"format", "pv-snapshot-9"}, {"nodes", nlohmann::json::array()}});
        FAIL() << "expected InvalidParams";
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::InvalidParams);
    }
    EXPECT_THROW(snapshot::graph_from_snapshot(nlohmann::json{{"format", "pv-snapshot-1"}, {"nodes", 3}}), core::PvError);
}
