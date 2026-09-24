#include <gtest/gtest.h>

#include "fixture_util.hpp"

using namespace pv;
using namespace pv::builder;

TEST(BuilderMetrics, FixtureNumbers) {
    pv::builder::testing::FixtureState s;
    s.link_all();
    compute_metrics(s.g);
    const core::Metrics& is_valid = s.g.node("function:app/utils.py#is_valid").metrics;
    EXPECT_EQ(is_valid.fan_in, 3);
    EXPECT_EQ(is_valid.fan_out, 0);
    EXPECT_EQ(is_valid.complexity, 2);
    EXPECT_EQ(is_valid.loc, 2);
    EXPECT_EQ(s.g.node("class:app/services.py#UserService").metrics.fan_in, 4);
    EXPECT_EQ(s.g.node("module:app/models.py").metrics.loc, 17);
    EXPECT_EQ(s.g.node("package:app").metrics.loc, 52);
    EXPECT_EQ(s.g.node("project:").metrics.loc, 72);
}
