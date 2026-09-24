#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/search/search.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

namespace {

std::vector<search::SearchHit> run(const std::string& text, const std::vector<core::NodeKind>& kinds, int limit) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));
    return project->read([&](const graph::Graph& g) { return search::search_nodes(g, text, kinds, limit); });
}

}  // namespace

TEST(SearchNodes, RankedResults) {
    const auto hits = run("user", {}, 50);
    ASSERT_GE(hits.size(), 5u);
    EXPECT_EQ(hits[0].node_id, "class:app/models.py#User");
    EXPECT_EQ(hits[0].score, 100);
    EXPECT_EQ(hits[1].node_id, "class:app/services.py#UserService");
    EXPECT_EQ(hits[1].score, 80);
    // Name-contains matches (60) at the same level are ordered by name: format_user, get_user, get_user_route.
    EXPECT_EQ(hits[2].node_id, "method:app/services.py#UserService.format_user");
    EXPECT_EQ(hits[2].score, 60);
    EXPECT_EQ(hits[3].node_id, "method:app/services.py#UserService.get_user");
    EXPECT_EQ(hits[3].score, 60);
    EXPECT_EQ(hits[4].node_id, "function:app/api/routes.py#get_user_route");
    EXPECT_EQ(hits[4].score, 60);
}

TEST(SearchNodes, KindsAndLimit) {
    const auto functions = run("user", {core::NodeKind::Function}, 50);
    ASSERT_FALSE(functions.empty());
    EXPECT_EQ(functions[0].node_id, "function:app/api/routes.py#get_user_route");
    EXPECT_EQ(run("user", {}, 1).size(), 1u);
}
