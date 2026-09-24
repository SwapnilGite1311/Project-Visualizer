#include <gtest/gtest.h>

#include "analysis_fixture.hpp"

using namespace pv;
using Json = nlohmann::json;

TEST(AnalysisSummary, FixtureNumbers) {
    analysis::testing::Fixture f;
    const Json s = f.read([&](const graph::Graph& g) {
        return analysis::build_summary(g, f.project->root_path(), f.project->syntax_error_files(), f.project->parse_errors());
    });
    EXPECT_EQ(s["files"], 8);
    EXPECT_EQ(s["total_loc"], 72);
    EXPECT_EQ(s["counts"]["method"], 5);
    EXPECT_EQ(s["counts"]["statement"], 0);
    EXPECT_EQ(s["externals"], (Json{"sys"}));
    EXPECT_EQ(s["largest_modules"][0]["node_id"], "module:app/models.py");
    EXPECT_EQ(s["largest_packages"][0]["node_id"], "package:app");
    EXPECT_EQ(s["largest_packages"][0]["loc"], 52);
    EXPECT_EQ(s["largest_packages"][0]["modules"], 6);
    EXPECT_EQ(s["syntax_error_files"], (Json{"broken.py"}));
    EXPECT_EQ(s["languages"], (Json::array({{{"id", "python"}, {"files", 8}, {"loc", 72}}})));
}
