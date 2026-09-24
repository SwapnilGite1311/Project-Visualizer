#include <gtest/gtest.h>

#include "fixture_util.hpp"

using namespace pv;
using namespace pv::builder;

TEST(BuilderDefinitions, ModelsNodes) {
    const pv::builder::testing::FixtureState s;
    const core::Node& user = s.g.node("class:app/models.py#User");
    EXPECT_EQ(user.parent_id, "module:app/models.py");
    EXPECT_EQ(user.qualified_name, "app.models.User");
    EXPECT_EQ(user.metrics.loc, 9);
    const core::Node& display = s.g.node("method:app/models.py#User.display");
    EXPECT_EQ(display.parent_id, "class:app/models.py#User");
    EXPECT_EQ(display.metrics.complexity, 2);
    EXPECT_EQ(display.level, 4);
    const core::Node& module = s.g.node("module:app/models.py");
    EXPECT_EQ(module.span.end_line, 17);
    EXPECT_EQ(module.qualified_name, "app.models");
}
