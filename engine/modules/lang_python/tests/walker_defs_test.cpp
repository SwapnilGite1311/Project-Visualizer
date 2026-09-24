#include <gtest/gtest.h>

#include "py_test_util.hpp"

using namespace pv;
using namespace pv::lang_python;

TEST(LangPyWalkerDefs, ModelsFixture) {
    const parse::FileExtraction fx = lang_python::testing::walk_source(lang_python::testing::fixture("app/models.py"));
    ASSERT_EQ(fx.definitions.size(), 5u);
    const auto& d = fx.definitions;
    EXPECT_EQ(d[0].qualname, "Base");
    EXPECT_EQ(d[0].kind, "class");
    EXPECT_EQ(d[0].span.start_line, 4);
    EXPECT_EQ(d[0].span.end_line, 6);
    EXPECT_EQ(d[0].parent_qualname, "");
    EXPECT_EQ(d[1].qualname, "Base.save");
    EXPECT_EQ(d[1].kind, "function");
    EXPECT_EQ(d[1].parent_qualname, "Base");
    EXPECT_TRUE(d[1].parent_is_class);
    EXPECT_EQ(d[1].span.start_line, 5);
    EXPECT_EQ(d[1].span.end_line, 6);
    EXPECT_EQ(d[2].qualname, "User");
    EXPECT_EQ(d[2].span.start_line, 9);
    EXPECT_EQ(d[2].span.end_line, 17);
    EXPECT_EQ(d[3].qualname, "User.__init__");
    EXPECT_EQ(d[3].span.start_line, 10);
    EXPECT_EQ(d[3].span.end_line, 12);
    EXPECT_EQ(d[4].qualname, "User.display");
    EXPECT_EQ(d[4].kind, "function");
    EXPECT_EQ(d[4].span.start_line, 14);
    EXPECT_EQ(d[4].span.end_line, 17);
    EXPECT_EQ(d[4].complexity, 2);
}

TEST(LangPyWalkerDefs, DuplicateAndNested) {
    const parse::FileExtraction dup = lang_python::testing::walk_source("def h():\n    pass\ndef h():\n    pass\n");
    ASSERT_EQ(dup.definitions.size(), 2u);
    EXPECT_EQ(dup.definitions[0].qualname, "h");
    EXPECT_EQ(dup.definitions[1].qualname, "h~2");

    const parse::FileExtraction nested = lang_python::testing::walk_source("def a():\n    def b():\n        pass\n");
    ASSERT_EQ(nested.definitions.size(), 2u);
    EXPECT_EQ(nested.definitions[0].qualname, "a");
    EXPECT_EQ(nested.definitions[1].qualname, "a.b");
    EXPECT_FALSE(nested.definitions[1].parent_is_class);
}
