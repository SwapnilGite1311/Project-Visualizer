#include <gtest/gtest.h>

#include <algorithm>

#include "analysis_fixture.hpp"

using namespace pv;
using Json = nlohmann::json;

TEST(AnalysisHotspots, RankedWithReasons) {
    analysis::testing::Fixture f;
    const Json h = f.read([](const graph::Graph& g) { return analysis::build_hotspots(g, 5)["hotspots"]; });
    ASSERT_LE(h.size(), 5u);
    ASSERT_FALSE(h.empty());
    for (std::size_t i = 0; i < h.size(); ++i) {
        EXPECT_GE(h[i]["score"].get<int>(), 0);
        EXPECT_LE(h[i]["score"].get<int>(), 100);
        if (i > 0) EXPECT_GE(h[i - 1]["score"].get<int>(), h[i]["score"].get<int>());
    }

    // The function/method/module with the highest complexity gets a "High complexity" reason.
    const Json all = f.read([](const graph::Graph& g) { return analysis::build_hotspots(g, 100)["hotspots"]; });
    const auto most_complex = std::max_element(all.begin(), all.end(), [](const Json& a, const Json& b) {
        return a["metrics"]["complexity"].get<int>() < b["metrics"]["complexity"].get<int>();
    });
    bool has_reason = false;
    for (const Json& r : (*most_complex)["reasons"]) has_reason |= r.get<std::string>().rfind("High complexity", 0) == 0;
    EXPECT_TRUE(has_reason) << (*most_complex).dump();

    EXPECT_EQ(f.read([](const graph::Graph& g) { return analysis::build_hotspots(g, 1)["hotspots"].size(); }), 1u);
}
