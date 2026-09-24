#include <gtest/gtest.h>

#include <algorithm>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_impact(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

namespace {

std::vector<std::string> affected_ids(const Json& result) {
    std::vector<std::string> ids;
    for (const Json& a : result["affected"]) ids.push_back(a["node_id"]);
    return ids;
}

}  // namespace

TEST(ImpactRpc, Analyze) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_impact(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());

    const Json service =
        env.call("impact.analyze", Json{{"project_id", pid}, {"node_id", "class:app/services.py#UserService"}});
    EXPECT_EQ(affected_ids(service),
              (std::vector<std::string>{"function:app/api/routes.py#get_user_route", "function:main.py#main",
                                        "module:app/api/routes.py", "module:main.py"}));
    for (const Json& a : service["affected"]) EXPECT_EQ(a["distance"], 1);
    EXPECT_EQ(service["risk"]["score"], 42);
    EXPECT_EQ(service["risk"]["level"], "medium");
    EXPECT_EQ(service["risk"]["factors"],
              (Json{"4 direct dependents", "0 indirect dependents", "spans 2 packages"}));

    const Json valid =
        env.call("impact.analyze", Json{{"project_id", pid}, {"node_id", "function:app/utils.py#is_valid"}});
    std::vector<std::string> ids = affected_ids(valid);
    std::sort(ids.begin(), ids.end());
    EXPECT_EQ(ids, (std::vector<std::string>{"function:app/api/routes.py#get_user_route",
                                             "method:app/services.py#UserService.get_user",
                                             "module:app/services.py"}));
}
