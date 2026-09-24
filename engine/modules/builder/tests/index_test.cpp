#include <gtest/gtest.h>

#include "fixture_util.hpp"

using namespace pv;
using namespace pv::builder;

TEST(BuilderIndex, ModulesAndSymbols) {
    const pv::builder::testing::FixtureState s;
    EXPECT_EQ(s.index.file_for_module("app.models"), "app/models.py");
    EXPECT_EQ(s.index.symbol_id("app/utils.py", "is_valid"), "function:app/utils.py#is_valid");
    EXPECT_EQ(s.index.symbol_id("app/models.py", "User.display"), "method:app/models.py#User.display");
}
