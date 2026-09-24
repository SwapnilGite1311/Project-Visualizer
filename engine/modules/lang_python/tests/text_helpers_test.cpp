#include <gtest/gtest.h>

#include "pv/lang_python/internal.hpp"
#include "pv/parse/ts.hpp"

using namespace pv;
using namespace pv::lang_python;

TEST(LangPyText, FirstLine) {
    EXPECT_EQ(first_line("def f(x):\n  pass", 200), "def f(x):");
    EXPECT_EQ(first_line("abcdef", 3), "abc");
}

TEST(LangPyText, StripStringLiteral) {
    EXPECT_EQ(strip_string_literal("\"\"\"Hello.\"\"\""), "Hello.");
    EXPECT_EQ(strip_string_literal("r'x'"), "x");
}

TEST(LangPyText, Docstring) {
    parse::TsParser parser(tree_sitter_python());
    const std::string with_doc = "\"\"\"Doc.\"\"\"\nx = 1\n";
    const parse::TsTree tree = parser.parse(with_doc);
    EXPECT_EQ(extract_docstring(tree.root(), with_doc), "Doc.");
    const std::string without = "x = 1\n";
    const parse::TsTree tree2 = parser.parse(without);
    EXPECT_EQ(extract_docstring(tree2.root(), without), "");
}
