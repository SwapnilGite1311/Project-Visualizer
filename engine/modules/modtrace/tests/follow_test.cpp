#include <gtest/gtest.h>

#include "modtrace_fixture.hpp"
#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/modtrace/modtrace.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;
using namespace pv::modtrace::testing;

TEST(ModtraceFollow, ForwardAndBackward) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));
    project->read([](const graph::Graph& g) {
        const auto forward = modtrace::follow(g, request(), "t1", "forward", kRoute);
        ASSERT_EQ(forward.size(), 2u);
        EXPECT_EQ(forward[0].from_id, "module:app/api/routes.py");
        EXPECT_EQ(forward[0].to_id, "module:app/services.py");
        EXPECT_EQ(forward[1].to_id, "module:app/utils.py");
        EXPECT_EQ(forward[1].start_ns, 300);

        EXPECT_EQ(modtrace::follow(g, request(), "t1", "forward", kIsValid).size(), 1u);
        EXPECT_EQ(modtrace::follow(g, request(), "t1", "forward", "").size(), 2u);

        const auto backward = modtrace::follow(g, request(), "t1", "backward", kIsValid);
        ASSERT_EQ(backward.size(), 2u);
        EXPECT_EQ(backward[0].to_id, "module:app/utils.py");
        EXPECT_EQ(backward[1].from_id, "module:app/api/routes.py");

        EXPECT_TRUE(modtrace::follow(g, request(), "missing", "forward", "").empty());
        EXPECT_THROW(modtrace::follow(g, request(), "t1", "sideways", ""), core::PvError);
    });
}
