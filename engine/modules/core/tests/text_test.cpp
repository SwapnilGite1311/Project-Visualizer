#include <gtest/gtest.h>

#include "pv/core/text.hpp"

using namespace pv::core;

TEST(CoreText, Split) {
    EXPECT_EQ(split("a,,b", ','), (std::vector<std::string>{"a", "", "b"}));
    EXPECT_EQ(split("", ','), (std::vector<std::string>{""}));
}

TEST(CoreText, Join) {
    EXPECT_EQ(join({"a", "b", "c"}, "."), "a.b.c");
    EXPECT_EQ(join({}, "."), "");
}

TEST(CoreText, TrimAndLower) {
    EXPECT_EQ(trim("  x \n"), "x");
    EXPECT_EQ(to_lower("AbC"), "abc");
}

TEST(CoreText, ContainsAndSubsequence) {
    EXPECT_TRUE(contains_ci("UserService", "service"));
    EXPECT_TRUE(contains_ci("UserService", ""));
    EXPECT_TRUE(is_subsequence_ci("usv", "UserService"));
    EXPECT_FALSE(is_subsequence_ci("xyz", "UserService"));
}
