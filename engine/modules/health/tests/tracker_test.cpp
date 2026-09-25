#include <gtest/gtest.h>

#include "pv/health/health.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

namespace {

runtime::MappedEvent mapped(const std::string& node, bool error, const std::string& kind = "call") {
    runtime::MappedEvent m;
    m.ev.kind = kind;
    m.ev.status = error ? "error" : "ok";
    m.ev.trace_id = "t";
    m.ev.duration_ns = 1000000;
    m.node_id = node;
    return m;
}

}  // namespace

TEST(HealthTracker, StatesRollUpToAncestors) {
    health::tracker().reset_for_tests();
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));
    const std::string pid = project->id();
    health::tracker().on_events(pid,
                                {mapped("function:app/utils.py#is_valid", true), mapped("function:app/utils.py#is_valid", false),
                                 mapped("function:main.py#main", false), mapped("", true)},
                                1000);
    const auto states = project->read([&](const graph::Graph& g) { return health::tracker().evaluate(pid, g, 2000); });
    EXPECT_EQ(states.at("function:app/utils.py#is_valid").state, core::Health::Error);
    EXPECT_EQ(states.at("module:app/utils.py").state, core::Health::Error);
    EXPECT_EQ(states.at("package:app").state, core::Health::Error);
    EXPECT_EQ(states.at("project:").state, core::Health::Error);
    EXPECT_EQ(states.at("module:app/utils.py").calls, 2);
    EXPECT_EQ(states.at("module:app/utils.py").reason.rfind("child: errors", 0), 0u);
    EXPECT_EQ(states.at("function:main.py#main").state, core::Health::Ok);
    EXPECT_EQ(states.at("module:main.py").state, core::Health::Ok);
    EXPECT_EQ(states.count("function:app/utils.py#normalize"), 0u);

    health::tracker().clear(pid);
    EXPECT_TRUE(project->read([&](const graph::Graph& g) { return health::tracker().evaluate(pid, g, 2000); }).empty());
    health::tracker().reset_for_tests();
}
