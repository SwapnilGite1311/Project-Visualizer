#include <gtest/gtest.h>

#include "pv/change/change.hpp"
#include "pv/core/error.hpp"
#include "pv/impact/impact.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

namespace {

const std::string kService = "class:app/services.py#UserService";

change::Change make(const std::string& kind) { return change::change_from_json({{"kind", kind}, {"node_id", kService}}); }

health::HealthInfo info(core::Health state, int calls) {
    health::HealthInfo h;
    h.state = state;
    h.calls = calls;
    return h;
}

}  // namespace

class ChangePreview : public ::testing::Test {
protected:
    session::TestEnv env{std::make_unique<lang_python::PythonAdapter>()};
    std::shared_ptr<session::Project> project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));

    nlohmann::json run(const std::string& kind, const std::map<std::string, health::HealthInfo>& health = {}) {
        return project->read([&](const graph::Graph& g) { return change::preview(g, make(kind), health); });
    }
};

TEST_F(ChangePreview, KindsWeighTheStaticRisk) {
    const auto rename = run("rename");
    EXPECT_EQ(rename["breakdown"]["static_score"], 42);
    EXPECT_EQ(rename["risk"]["score"], 42);
    EXPECT_EQ(rename["risk"]["level"], "medium");
    EXPECT_EQ(rename["risk"]["factors"].size(), 4u);  // impact's 3 + the change type
    EXPECT_EQ(rename["risk"]["factors"][3], "change type: rename (x1.0)");
    EXPECT_EQ(rename["change"], (nlohmann::json{{"kind", "rename"}, {"node_id", kService}}));
    EXPECT_FALSE(rename["affected"].empty());

    const auto body = run("modify_body");
    EXPECT_EQ(body["risk"]["score"], 25);  // round(42 x 0.6)
    EXPECT_EQ(body["risk"]["level"], "medium");
    EXPECT_EQ(body["breakdown"]["type_multiplier"], 0.6);

    const auto del = run("delete");
    EXPECT_EQ(del["risk"]["score"], 55);  // round(42 x 1.3)
    EXPECT_EQ(del["risk"]["level"], "high");
}

TEST_F(ChangePreview, RuntimeEvidenceAddsToTheScore) {
    const auto affected = run("rename")["affected"];
    ASSERT_GE(affected.size(), 2u);
    const std::map<std::string, health::HealthInfo> health{
        {affected[0]["node_id"], info(core::Health::Ok, 5)},
        {affected[1]["node_id"], info(core::Health::Error, 3)},
    };
    const auto r = run("rename", health);
    EXPECT_EQ(r["breakdown"]["runtime_bonus"], 14);  // 2 x 2 ran + 10 unhealthy
    EXPECT_EQ(r["risk"]["score"], 56);
    EXPECT_EQ(r["risk"]["level"], "high");
    EXPECT_EQ(r["risk"]["factors"].size(), 6u);
    EXPECT_EQ(r["risk"]["factors"][4], "2 affected parts ran recently");
    EXPECT_EQ(r["risk"]["factors"][5], "some affected parts are currently unhealthy");
}

TEST_F(ChangePreview, ValidatesTheChange) {
    EXPECT_THROW(change::change_from_json({{"kind", "explode"}, {"node_id", kService}}), core::PvError);
    EXPECT_THROW(change::change_from_json({{"kind", "rename"}}), core::PvError);
    EXPECT_THROW(change::change_from_json("rename"), core::PvError);
    const auto c = change::change_from_json({{"kind", "move"}, {"node_id", kService}, {"new_parent_id", "package:app/api"}});
    EXPECT_EQ(change::change_to_json(c)["new_parent_id"], "package:app/api");
    EXPECT_DOUBLE_EQ(change::type_multiplier("move"), 0.8);
    EXPECT_DOUBLE_EQ(change::type_multiplier("change_signature"), 1.0);
}
