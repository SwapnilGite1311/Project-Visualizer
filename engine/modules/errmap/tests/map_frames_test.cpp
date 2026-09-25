#include <gtest/gtest.h>

#include "pv/errmap/errmap.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"
#include "samples.hpp"

using namespace pv;

TEST(ErrmapMapFrames, FramesPointAtElements) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const std::string root = session::pyproj_small_path();
    const auto project = env.projects->get_ready(env.open_and_wait(root));
    auto t = errmap::parse_any(errmap::testing::python_trace(root));
    t.frames.push_back({"C:/elsewhere/lib.py", 3, "helper"});
    t.frames.push_back({"utils.py", 5, "normalize"});  // bare file name, as in Java stacks
    project->read([&](const graph::Graph& g) {
        errmap::map_frames(t, g, root);
        return 0;
    });
    EXPECT_EQ(t.frames[0].node_id, "function:main.py#main");
    EXPECT_EQ(t.frames[1].node_id, "method:app/services.py#UserService.get_user");
    EXPECT_EQ(t.frames[2].node_id, "function:app/utils.py#is_valid");
    EXPECT_TRUE(t.frames[2].in_project);
    EXPECT_EQ(t.frames[3].node_id, "");
    EXPECT_FALSE(t.frames[3].in_project);
    EXPECT_EQ(t.frames[4].node_id, "function:app/utils.py#normalize");
}
