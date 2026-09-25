#include <gtest/gtest.h>

#include "pv/errmap/errmap.hpp"
#include "samples.hpp"

using namespace pv;
using namespace pv::errmap::testing;

TEST(ErrmapGoCs, GoPanics) {
    const auto t = errmap::parse_go(kGo);
    ASSERT_TRUE(t.has_value());
    EXPECT_EQ(t->error_type, "panic");
    EXPECT_EQ(t->message, "runtime error: index out of range [3] with length 3");
    ASSERT_EQ(t->frames.size(), 2u);
    EXPECT_EQ(t->frames[0].function, "main.(*Store).Count");
    EXPECT_EQ(t->frames[0].file_path, "/home/u/shop/internal/store/store.go");
    EXPECT_EQ(t->frames[0].line, 17);
    EXPECT_TRUE(t->frames[0].is_origin);
}

TEST(ErrmapGoCs, CsharpAndGeneric) {
    const auto cs = errmap::parse_csharp(kCsharp);
    ASSERT_TRUE(cs.has_value());
    EXPECT_EQ(cs->error_type, "System.InvalidOperationException");
    ASSERT_EQ(cs->frames.size(), 2u);  // framework frames without a file are skipped
    EXPECT_EQ(cs->frames[0].file_path, "C:\\shop\\Services\\OrderService.cs");
    EXPECT_EQ(cs->frames[0].line, 42);

    const auto g = errmap::parse_generic(kGeneric);
    EXPECT_EQ(g.language, "unknown");
    EXPECT_EQ(g.error_type, "Error");
    ASSERT_EQ(g.frames.size(), 2u);
    EXPECT_EQ(g.frames[0].file_path, "src/lib/parse.rb");
    EXPECT_EQ(g.frames[1].line, 7);
    EXPECT_TRUE(g.frames[0].is_origin);
}

TEST(ErrmapGoCs, ParseAnyPicksTheLanguage) {
    EXPECT_EQ(errmap::parse_any(python_trace("C:/x")).language, "python");
    EXPECT_EQ(errmap::parse_any(kNode).language, "javascript");
    EXPECT_EQ(errmap::parse_any(kJava).language, "java");
    EXPECT_EQ(errmap::parse_any(kGo).language, "go");
    EXPECT_EQ(errmap::parse_any(kCsharp).language, "csharp");
    EXPECT_EQ(errmap::parse_any(kGeneric).language, "unknown");
}
