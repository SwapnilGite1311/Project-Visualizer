#include <gtest/gtest.h>

#include "pv/search/search.hpp"

using namespace pv;

namespace {

core::Node named(const std::string& name, const std::string& qualified = "") {
    core::Node n;
    n.name = name;
    n.qualified_name = qualified.empty() ? name : qualified;
    return n;
}

}  // namespace

TEST(SearchScore, Rules) {
    const core::Node user_service = named("UserService", "app.services.UserService");
    EXPECT_EQ(search::score_match("userservice", user_service), 100);
    EXPECT_EQ(search::score_match("user", user_service), 80);
    EXPECT_EQ(search::score_match("serv", user_service), 60);
    EXPECT_EQ(search::score_match("usv", user_service), 20);
    EXPECT_EQ(search::score_match("zzz", user_service), 0);
    EXPECT_EQ(search::score_match("models", named("x", "app.models.x")), 40);
}
