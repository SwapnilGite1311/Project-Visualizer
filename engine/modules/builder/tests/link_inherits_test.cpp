#include <gtest/gtest.h>

#include "fixture_util.hpp"

using namespace pv;
using namespace pv::builder;
using core::EdgeKind;

TEST(BuilderLinkInherits, UserInheritsBase) {
    pv::builder::testing::FixtureState s;
    s.link_all();
    EXPECT_EQ(s.count_edges(EdgeKind::Inherits), 1u);
    EXPECT_EQ(s.targets("class:app/models.py#User", EdgeKind::Inherits),
              (std::vector<std::string>{"class:app/models.py#Base"}));
}
