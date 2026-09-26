#include <gtest/gtest.h>

#include <chrono>

#include "cache_fixture.hpp"
#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_cache(pv::session::Registry& reg);

using namespace pv;
using namespace pv::cache::testing;

namespace {

std::vector<std::string> node_ids(const session::TestEnv& env, const std::string& pid) {
    return env.projects->get(pid)->read([](const graph::Graph& g) {
        std::vector<std::string> ids;
        for (const core::Node* n : g.all_nodes()) ids.push_back(n->id);
        std::sort(ids.begin(), ids.end());
        return ids;
    });
}

}  // namespace

TEST(CacheRpc, ReopeningUsesTheCache) {
    CacheDirScope scope;
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_cache(*env.reg);
    const std::string root = session::pyproj_small_path();

    const std::string first = env.open_and_wait(root);
    const auto first_nodes = node_ids(env, first);
    const auto after_first = env.call("cache.status", {{"project_id", first}});
    EXPECT_EQ(after_first["files"], 8);  // every fixture file was stored
    const int64_t first_hits = after_first["hits"].get<int64_t>();  // identical files (empty __init__.py) share an entry
    env.projects->close(first);

    const std::string second = env.open_and_wait(root);
    const auto status = env.call("cache.status", {{"project_id", second}});
    EXPECT_EQ(status["hits"].get<int64_t>() - first_hits, 8);  // nothing was parsed again
    EXPECT_EQ(node_ids(env, second), first_nodes);

    EXPECT_EQ(env.call("cache.clear", {{"project_id", second}})["ok"], true);
    EXPECT_EQ(env.call("cache.status", {{"project_id", second}})["files"], 0);
}

TEST(CacheRpc, UnknownProject) {
    CacheDirScope scope;
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_cache(*env.reg);
    EXPECT_THROW(env.call("cache.status", {{"project_id", "nope"}}), core::PvError);
}
