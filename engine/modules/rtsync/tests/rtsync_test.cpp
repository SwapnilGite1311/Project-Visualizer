#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/rtsync/rtsync.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

namespace {

constexpr int64_t kSec = 1000000000;

runtime::MappedEvent ev(const std::string& node, const std::string& parent, int64_t start_ns, bool error = false) {
    runtime::MappedEvent m;
    m.ev.kind = "call";
    m.ev.status = error ? "error" : "ok";
    m.ev.start_ns = start_ns;
    m.ev.duration_ns = 3000000;
    m.node_id = node;
    m.parent_node_id = parent;
    return m;
}

}  // namespace

TEST(Rtsync, RollsUpToTheLevelAndMatchesEdges) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));
    const std::string main = "function:main.py#main";
    const std::string get_user = "method:app/services.py#UserService.get_user";
    const std::string is_valid = "function:app/utils.py#is_valid";
    const std::vector<runtime::MappedEvent> events{
        ev(main, "", 1 * kSec),                 // too old for the 5 s window below
        ev(main, "", 10 * kSec),
        ev(get_user, main, 10 * kSec + 1),
        ev(is_valid, get_user, 10 * kSec + 2, true),
    };
    std::map<std::string, health::HealthInfo> states;
    states["package:app"].state = core::Health::Error;

    project->read([&](const graph::Graph& g) {
        const auto top = rtsync::live_level_view(g, "project:", events, states, 5 * kSec);
        EXPECT_EQ(top["parent"]["id"], "project:");
        EXPECT_EQ(top["nodes"].size(), 4u);
        EXPECT_EQ(top["live"]["module:main.py"]["calls"], 1);
        EXPECT_EQ(top["live"]["package:app"]["calls"], 2);
        EXPECT_EQ(top["live"]["package:app"]["errors"], 1);
        EXPECT_EQ(top["live"]["package:app"]["health"], "error");
        EXPECT_EQ(top["live"]["module:main.py"]["health"], "unknown");
        EXPECT_DOUBLE_EQ(top["live"]["package:app"]["p95_ms"].get<double>(), 3.0);
        ASSERT_EQ(top["flows"].size(), 1u);  // services → utils stays inside app
        EXPECT_EQ(top["flows"][0]["source_id"], "module:main.py");
        EXPECT_EQ(top["flows"][0]["target_id"], "package:app");
        EXPECT_EQ(top["flows"][0]["count"], 1);
        EXPECT_EQ(top["flows"][0]["edge_id"], "agg|calls|module:main.py|package:app");

        const auto app = rtsync::live_level_view(g, "package:app", events, states, 5 * kSec);
        EXPECT_FALSE(app["live"].contains("module:main.py"));
        ASSERT_EQ(app["flows"].size(), 1u);
        EXPECT_EQ(app["flows"][0]["source_id"], "module:app/services.py");
        EXPECT_EQ(app["flows"][0]["target_id"], "module:app/utils.py");

        EXPECT_EQ(rtsync::live_level_view(g, "project:", events, states, 100 * kSec)["live"]["module:main.py"]["calls"], 2);
    });
}
