#include <gtest/gtest.h>

#include "pv/parse/ts.hpp"

extern "C" const TSLanguage* tree_sitter_python(void);

using namespace pv::parse;

TEST(ParseTs, ParsesPythonFunction) {
    TsParser parser(tree_sitter_python());
    const std::string src = "def f(x):\n    return x\n";
    const TsTree tree = parser.parse(src);
    const TSNode root = tree.root();
    EXPECT_EQ(node_type(root), "module");
    const TSNode fn = named_children(root).at(0);
    EXPECT_EQ(node_type(fn), "function_definition");
    EXPECT_EQ(node_text(child_by_field(fn, "name"), src), "f");
    EXPECT_EQ(node_span(fn).start_line, 1);
    EXPECT_EQ(node_span(fn).end_line, 2);
    EXPECT_FALSE(tree.has_error());
}

TEST(ParseTs, SyntaxError) {
    TsParser parser(tree_sitter_python());
    EXPECT_TRUE(parser.parse("def (:").has_error());
}

TEST(ParseTs, MoveTree) {
    TsParser parser(tree_sitter_python());
    TsTree a = parser.parse("x = 1\n");
    TsTree b = std::move(a);
    EXPECT_EQ(node_type(b.root()), "module");
    EXPECT_FALSE(all_children(b.root()).empty());
}
