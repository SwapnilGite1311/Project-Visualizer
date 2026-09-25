#include <gtest/gtest.h>

#include "pv/errmap/errmap.hpp"
#include "samples.hpp"

using namespace pv;

TEST(ErrmapJsJava, NodeStacks) {
    const auto t = errmap::parse_javascript(errmap::testing::kNode);
    ASSERT_TRUE(t.has_value());
    EXPECT_EQ(t->error_type, "TypeError");
    EXPECT_EQ(t->message, "Cannot read properties of undefined (reading 'trim')");
    ASSERT_EQ(t->frames.size(), 2u);  // the node:internal frame is skipped
    EXPECT_EQ(t->frames[0].function, "formatName");
    EXPECT_EQ(t->frames[0].file_path, "C:\\app\\src\\utils\\format.js");
    EXPECT_EQ(t->frames[0].line, 2);
    EXPECT_TRUE(t->frames[0].is_origin);
    EXPECT_FALSE(errmap::parse_javascript("TypeError: no frames").has_value());
}

TEST(ErrmapJsJava, JavaStacks) {
    const auto t = errmap::parse_java(errmap::testing::kJava);
    ASSERT_TRUE(t.has_value());
    EXPECT_EQ(t->error_type, "java.lang.IllegalStateException");
    EXPECT_EQ(t->message, "boom");
    ASSERT_EQ(t->frames.size(), 2u);  // frames after "Caused by:" are ignored
    EXPECT_EQ(t->frames[0].function, "com.acme.util.Helper.greet");
    EXPECT_EQ(t->frames[0].file_path, "Helper.java");
    EXPECT_EQ(t->frames[0].line, 6);
    EXPECT_TRUE(t->frames[0].is_origin);
    EXPECT_FALSE(errmap::parse_java(errmap::testing::kCsharp).has_value());
}
