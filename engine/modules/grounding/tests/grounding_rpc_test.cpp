#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/errmap/store.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/runtime/hub.hpp"
#include "pv/session/test_env.hpp"

void pv_register_runtime(pv::session::Registry& reg);
void pv_register_errmap(pv::session::Registry& reg);
void pv_register_grounding(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

TEST(GroundingRpc, AllMethods) {
    runtime::hub().reset_for_tests();
    errmap::store().reset_for_tests();
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_runtime(*env.reg);
    pv_register_errmap(*env.reg);
    pv_register_grounding(*env.reg);
    const std::string root = session::pyproj_small_path();
    const std::string pid = env.open_and_wait(root);

    const std::string trace = "Traceback (most recent call last):\n  File \"" + root +
                              "/app/utils.py\", line 9, in is_valid\n    return x\nValueError: bad id\n";
    const std::string error_id = env.call("errors.map_stack", {{"project_id", pid}, {"text", trace}})["error_id"];
    const Json for_error = env.call("grounding.for_error", {{"project_id", pid}, {"error_id", error_id}});
    EXPECT_EQ(for_error["kind"], "error");
    EXPECT_EQ(for_error["origin"]["node"]["id"], "function:app/utils.py#is_valid");
    EXPECT_THROW(env.call("grounding.for_error", {{"project_id", pid}, {"error_id", "nope"}}), core::PvError);

    const Json q = env.call("grounding.for_question", {{"project_id", pid}, {"question", "Where are users saved?"}});
    EXPECT_EQ(q["kind"], "question");
    EXPECT_FALSE(q["digest"].get<std::string>().empty());
    EXPECT_LE(q["digest"].get<std::string>().size(), 4000u);
    EXPECT_THROW(env.call("grounding.for_question", {{"project_id", pid}, {"question", std::string(2001, 'x')}}), core::PvError);

    const Json digest = env.call("grounding.digest", {{"project_id", pid}, {"max_chars", 600}});
    EXPECT_LE(digest["text"].get<std::string>().size(), 600u);

    const Json cites = env.call("grounding.check_citations", {{"project_id", pid}, {"node_ids", {"module:main.py", "module:nope.py"}}});
    EXPECT_EQ(cites["valid"], (Json{"module:main.py"}));
    EXPECT_EQ(cites["invalid"], (Json{"module:nope.py"}));
    EXPECT_THROW(env.call("grounding.check_citations", {{"project_id", pid}, {"node_ids", "module:main.py"}}), core::PvError);
    runtime::hub().reset_for_tests();
    errmap::store().reset_for_tests();
}
