#include <gtest/gtest.h>

#include "analysis_fixture.hpp"

using namespace pv;
using Json = nlohmann::json;

TEST(AnalysisCallTree, Fixture) {
    analysis::testing::Fixture f;
    const Json main_tree = f.read([](const graph::Graph& g) { return analysis::build_call_tree(g, "function:main.py#main", 2); });
    EXPECT_EQ(main_tree["root_id"], "function:main.py#main");
    EXPECT_EQ(main_tree["nodes"].size(), 2u);
    EXPECT_EQ(main_tree["edges"].size(), 1u);

    const Json get_user = f.read(
        [](const graph::Graph& g) { return analysis::build_call_tree(g, "method:app/services.py#UserService.get_user", 1); });
    EXPECT_EQ(get_user["nodes"].size(), 5u);
    EXPECT_EQ(get_user["edges"].size(), 4u);
}
