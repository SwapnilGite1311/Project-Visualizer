#include <gtest/gtest.h>

#include <algorithm>

#include "pv/grounding/grounding.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

namespace {

bool has(const std::vector<std::string>& v, const std::string& s) { return std::find(v.begin(), v.end(), s) != v.end(); }

}  // namespace

TEST(GroundingQuestion, Terms) {
    const auto terms = grounding::question_terms("How is a user validated? Where does getUserName call is_valid_id?");
    EXPECT_TRUE(has(terms, "user"));
    EXPECT_TRUE(has(terms, "validated"));
    EXPECT_TRUE(has(terms, "getusername"));
    EXPECT_TRUE(has(terms, "name"));   // camelCase part
    EXPECT_TRUE(has(terms, "is_valid_id"));
    EXPECT_TRUE(has(terms, "valid"));  // snake_case part
    EXPECT_FALSE(has(terms, "how"));   // stopword
    EXPECT_FALSE(has(terms, "is"));    // too short
    EXPECT_EQ(std::count(terms.begin(), terms.end(), "user"), 1);
    EXPECT_LE(grounding::question_terms("alpha beta gamma delta epsilon zeta theta iota kappa lambda omicron sigma omega").size(), 12u);
}

TEST(GroundingQuestion, MatchesRelevantCode) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const std::string root = session::pyproj_small_path();
    const auto project = env.projects->get_ready(env.open_and_wait(root));
    project->read([&](const graph::Graph& g) {
        const auto pack = grounding::build_question_pack(g, root, "How is a user validated?", "DIGEST", 24000);
        EXPECT_EQ(pack["kind"], "question");
        EXPECT_EQ(pack["digest"], "DIGEST");
        std::vector<std::string> ids;
        for (const auto& m : pack["matches"]) {
            ids.push_back(m["node_id"]);
            EXPECT_EQ(m["pack"]["node"]["id"], m["node_id"]);
        }
        EXPECT_TRUE(has(ids, "function:app/utils.py#is_valid") || has(ids, "class:app/services.py#UserService")) << pack["terms"].dump();
        EXPECT_LE(ids.size(), 8u);
        EXPECT_LE(pack.dump().size(), 24000u + 2000u);  // packs are kept within the budget (plus the envelope)

        const auto small = grounding::build_question_pack(g, root, "How is a user validated?", "DIGEST", 2000);
        EXPECT_LT(small["matches"].size(), pack["matches"].size());
        return 0;
    });
}
