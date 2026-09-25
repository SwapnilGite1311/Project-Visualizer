#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_deps(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

TEST(DepsRpc, NeighborsPathAndCycles) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_deps(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());

    const Json n = env.call("deps.neighbors", Json{{"project_id", pid}, {"node_id", "function:app/utils.py#is_valid"}, {"direction", "in"}});
    EXPECT_EQ(n["root_id"], "function:app/utils.py#is_valid");
    EXPECT_EQ(n["items"].size(), 3u);
    EXPECT_EQ(n["items"][0]["direction"], "in");
    EXPECT_FALSE(n["edges"].empty());

    const Json f = env.call("deps.focus", Json{{"project_id", pid}, {"node_id", "function:app/utils.py#is_valid"}});
    EXPECT_GE(f["items"].size(), n["items"].size());

    const Json p = env.call("deps.path", Json{{"project_id", pid}, {"from_id", "module:main.py"}, {"to_id", "package:app"}});
    EXPECT_EQ(p["found"], true);
    EXPECT_GE(p["node_ids"].size(), 2u);

    EXPECT_EQ(env.call("deps.cycles", Json{{"project_id", pid}}), (Json{{"cycles", Json::array()}}));
}
