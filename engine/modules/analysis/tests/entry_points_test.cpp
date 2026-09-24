#include <gtest/gtest.h>

#include "analysis_fixture.hpp"

using namespace pv;
using Json = nlohmann::json;

TEST(AnalysisEntryPoints, Fixture) {
    analysis::testing::Fixture f;
    const Json e = f.read([&](const graph::Graph& g) {
        return analysis::build_entry_points(g, f.project->main_guard_files())["entry_points"];
    });
    ASSERT_EQ(e.size(), 2u);
    EXPECT_EQ(e[0]["node_id"], "function:main.py#main");
    EXPECT_EQ(e[0]["reasons"], (Json{"function named main"}));
    EXPECT_EQ(e[1]["node_id"], "module:main.py");
    EXPECT_EQ(e[1]["reasons"], (Json{"has __main__ guard", "conventional entry file name"}));
}
