#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_search(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

TEST(SearchRpc, QueryAndSuggest) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_search(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());

    const Json q = env.call("search.query", Json{{"project_id", pid}, {"text", "user"}, {"kinds", {"class"}}, {"limit", 5}});
    ASSERT_EQ(q["results"].size(), 2u);
    EXPECT_EQ(q["results"][0]["node_id"], "class:app/models.py#User");
    EXPECT_EQ(q["results"][0]["score"], 100);
    EXPECT_EQ(q["results"][0]["qualified_name"], "app.models.User");

    const Json s = env.call("search.suggest", Json{{"project_id", pid}, {"prefix", "get"}});
    EXPECT_EQ(s["suggestions"], (Json{"get_user", "get_user_route"}));

    try {
        env.call("search.query", Json{{"project_id", pid}, {"text", "x"}, {"kinds", {"widget"}}});
        FAIL() << "expected InvalidParams";
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::InvalidParams);
    }
}
