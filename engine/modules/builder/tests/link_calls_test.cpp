#include <gtest/gtest.h>

#include "fixture_util.hpp"

using namespace pv;
using namespace pv::builder;
using core::EdgeKind;
using V = std::vector<std::string>;

TEST(BuilderLinkCalls, FixtureEdges) {
    pv::builder::testing::FixtureState s;
    s.link_all();
    EXPECT_EQ(s.targets("method:app/services.py#UserService.get_user", EdgeKind::Calls),
              (V{"class:app/models.py#User", "function:app/utils.py#is_valid", "function:app/utils.py#normalize",
                 "method:app/services.py#UserService.format_user"}));
    EXPECT_EQ(s.targets("method:app/services.py#UserService.format_user", EdgeKind::Calls),
              (V{"function:app/utils.py#normalize"}));
    EXPECT_EQ(s.targets("module:main.py", EdgeKind::Calls), (V{"external:sys", "function:main.py#main"}));
    EXPECT_EQ(s.targets("function:app/api/routes.py#get_user_route", EdgeKind::Calls),
              (V{"class:app/services.py#UserService", "function:app/utils.py#is_valid"}));
    EXPECT_EQ(s.count_edges(EdgeKind::Calls), 10u);
}
