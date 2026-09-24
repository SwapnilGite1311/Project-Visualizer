#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_analysis(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

TEST(AnalysisRpc, AllMethods) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_analysis(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());
    const Json id{{"project_id", pid}};

    EXPECT_TRUE(env.call("analysis.summary", id).contains("counts"));
    EXPECT_TRUE(env.call("analysis.hotspots", Json{{"project_id", pid}, {"limit", 3}}).contains("hotspots"));
    EXPECT_EQ(env.call("analysis.entry_points", id)["entry_points"].size(), 2u);
    EXPECT_EQ(env.call("analysis.boundaries", id)["packages"].size(), 2u);
    const Json tree = env.call("analysis.call_tree", Json{{"project_id", pid}, {"node_id", "function:main.py#main"}});
    EXPECT_TRUE(tree.contains("root_id"));
    EXPECT_TRUE(tree.contains("nodes"));
    EXPECT_TRUE(tree.contains("edges"));
}
