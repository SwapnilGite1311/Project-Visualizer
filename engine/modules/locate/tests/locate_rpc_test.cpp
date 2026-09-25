#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_locate(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

TEST(LocateRpc, NodeAtAndFileNodes) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_locate(*env.reg);
    const std::string root = session::pyproj_small_path();
    const std::string pid = env.open_and_wait(root);

    const Json hit = env.call("locate.node_at", Json{{"project_id", pid}, {"file_path", root + "/app/utils.py"}, {"line", 9}});
    EXPECT_EQ(hit["node"]["id"], "function:app/utils.py#is_valid");
    const Json relative = env.call("locate.node_at", Json{{"project_id", pid}, {"file_path", "app/services.py"}, {"line", 11}});
    EXPECT_EQ(relative["node"]["id"], "method:app/services.py#UserService.get_user");
    const Json outside = env.call("locate.node_at", Json{{"project_id", pid}, {"file_path", "C:/elsewhere/x.py"}, {"line", 1}});
    EXPECT_TRUE(outside["node"].is_null());
    EXPECT_THROW(env.call("locate.node_at", Json{{"project_id", pid}, {"file_path", "main.py"}, {"line", 0}}), core::PvError);

    const Json nodes = env.call("locate.file_nodes", Json{{"project_id", pid}, {"file_path", "main.py"}});
    ASSERT_EQ(nodes["nodes"].size(), 2u);
    EXPECT_EQ(nodes["nodes"][0]["id"], "module:main.py");
}
