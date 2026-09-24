#include <gtest/gtest.h>

#include "pv/parse/project_index.hpp"

using namespace pv::parse;

TEST(ParseIndex, ModulesAndSymbols) {
    ProjectIndex index;
    index.add_module_name("app.utils", "app/utils.py");
    index.add_module_name("app.utils", "other.py");
    index.add_module_name("", "ignored.py");
    EXPECT_EQ(index.file_for_module("app.utils"), "app/utils.py");
    EXPECT_TRUE(index.has_top_level("app"));
    EXPECT_FALSE(index.has_top_level("utils"));
    index.add_symbol("app/utils.py", "normalize", "function:app/utils.py#normalize");
    EXPECT_EQ(index.symbol_id("app/utils.py", "normalize"), "function:app/utils.py#normalize");
    EXPECT_FALSE(index.file_for_module("nope").has_value());
    EXPECT_FALSE(index.symbol_id("app/utils.py", "nope").has_value());
    EXPECT_FALSE(index.symbol_id("nope.py", "normalize").has_value());
}
