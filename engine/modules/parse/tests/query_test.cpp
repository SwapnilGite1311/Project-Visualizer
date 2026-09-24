#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/parse/query.hpp"
#include "pv/parse/ts.hpp"

extern "C" const TSLanguage* tree_sitter_python(void);

using namespace pv;
using namespace pv::parse;

TEST(ParseQuery, FindsFunctions) {
    const std::string src = "def a():\n  pass\ndef b():\n  pass\n";
    TsParser parser(tree_sitter_python());
    const TsTree tree = parser.parse(src);
    const TsQuery query(tree_sitter_python(), "(function_definition name: (identifier) @name) @definition.function");
    const std::vector<Match> matches = query.run(tree.root());
    ASSERT_EQ(matches.size(), 2u);
    ASSERT_NE(matches[0].find("name"), nullptr);
    EXPECT_EQ(node_text(matches[0].find("name")->node, src), "a");
    EXPECT_EQ(node_text(matches[1].find("name")->node, src), "b");
    EXPECT_NE(matches[0].find("definition.function"), nullptr);
    EXPECT_EQ(matches[0].find("missing"), nullptr);
}

TEST(ParseQuery, InvalidQueryThrows) {
    EXPECT_THROW(TsQuery(tree_sitter_python(), "(oops"), core::PvError);
}
