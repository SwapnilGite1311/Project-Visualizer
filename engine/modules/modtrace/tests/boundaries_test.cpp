#include <gtest/gtest.h>

#include "modtrace_fixture.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/modtrace/modtrace.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;
using namespace pv::modtrace::testing;

TEST(ModtraceBoundaries, CrossingsAndLoops) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));
    project->read([](const graph::Graph& g) {
        EXPECT_EQ(modtrace::module_of(g, kIsValid), "module:app/utils.py");
        EXPECT_EQ(modtrace::module_of(g, "module:app/utils.py"), "module:app/utils.py");
        EXPECT_EQ(modtrace::module_of(g, "package:app"), "");

        const auto crossings = modtrace::boundaries(g, request(), 0, 3);
        ASSERT_EQ(crossings.size(), 2u);
        EXPECT_EQ(crossings[0].from_id, "module:app/api/routes.py");
        EXPECT_EQ(crossings[0].to_id, "module:app/services.py");
        EXPECT_EQ(crossings[0].count, 1);
        EXPECT_DOUBLE_EQ(crossings[0].avg_ms, 2.0);
        EXPECT_EQ(crossings[1].from_id, "module:app/services.py");
        EXPECT_EQ(crossings[1].to_id, "module:app/utils.py");

        std::vector<runtime::MappedEvent> looping;
        for (int i = 0; i < 5; ++i) looping.push_back(ev("t2", "x" + std::to_string(i), "p", kIsValid, kGetUser, 1000 + i));
        looping.back().ev.status = "error";
        const auto loops = modtrace::boundaries(g, looping, 0, 3);
        ASSERT_EQ(loops.size(), 1u);
        EXPECT_EQ(loops[0].count, 5);
        EXPECT_EQ(loops[0].loops, 1);
        EXPECT_EQ(loops[0].errors, 1);
        EXPECT_TRUE(modtrace::boundaries(g, looping, 5000, 3).empty());
    });
}
