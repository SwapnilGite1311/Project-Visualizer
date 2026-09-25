#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_change(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

TEST(ChangeRpc, PreviewThroughRpc) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_change(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());

    const Json r = env.call("change.preview",
                            {{"project_id", pid}, {"change", {{"kind", "rename"}, {"node_id", "function:app/utils.py#is_valid"}, {"new_name", "is_valid_id"}}}});
    EXPECT_EQ(r["change"]["new_name"], "is_valid_id");
    EXPECT_TRUE(r["risk"]["score"].is_number_integer());
    EXPECT_TRUE(r["risk"]["level"].is_string());
    EXPECT_FALSE(r["affected"].empty());
    EXPECT_EQ(r["breakdown"]["runtime_bonus"], 0);  // no runtime data for this project

    EXPECT_THROW(env.call("change.preview", {{"project_id", pid}, {"change", {{"kind", "rename"}, {"node_id", "function:nope.py#x"}}}}),
                 core::PvError);
    EXPECT_THROW(env.call("change.preview", {{"project_id", pid}}), core::PvError);
    EXPECT_THROW(env.call("change.preview", {{"project_id", pid}, {"change", {{"kind", "rewrite"}, {"node_id", "module:main.py"}}}}),
                 core::PvError);
}
