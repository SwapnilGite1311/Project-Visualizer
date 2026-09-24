#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_context(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

TEST(ContextRpc, ForNode) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_context(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());
    const Json p =
        env.call("context.for_node", Json{{"project_id", pid}, {"node_id", "function:app/utils.py#is_valid"}});
    EXPECT_EQ(p["node"]["id"], "function:app/utils.py#is_valid");
    EXPECT_EQ(p["callers"].size(), 2u);
    try {
        env.call("context.for_node", Json{{"project_id", pid}, {"node_id", "function:nope.py#x"}});
        FAIL() << "expected NodeNotFound";
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::NodeNotFound);
    }
}
