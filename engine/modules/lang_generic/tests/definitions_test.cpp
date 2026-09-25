#include <gtest/gtest.h>

#include "pv/core/text.hpp"
#include "pv/lang_generic/query_extractor.hpp"

extern "C" const TSLanguage* tree_sitter_python(void);

using namespace pv;

namespace {

std::string fixture(const std::string& rel) {
    return core::read_file_text(std::string(PV_ENGINE_SOURCE_DIR) + "/modules/lang_python/tests/fixtures/pyproj_small/" + rel);
}

lang_generic::QuerySpec python_spec() {
    lang_generic::QuerySpec spec;
    spec.language_id = "python";
    spec.language = tree_sitter_python();
    spec.definitions_query =
        "(class_definition name: (identifier) @name) @definition.class "
        "(function_definition name: (identifier) @name) @definition.function";
    spec.decision_node_types = {"if_statement"};
    return spec;
}

}  // namespace

TEST(LangGenericDefs, NestingAndQualnames) {
    const auto fx = lang_generic::extract_with_queries(python_spec(), "app/models.py", fixture("app/models.py"));
    EXPECT_EQ(fx.file_path, "app/models.py");
    EXPECT_EQ(fx.language, "python");
    EXPECT_EQ(fx.loc, 17);
    EXPECT_FALSE(fx.has_syntax_errors);
    std::vector<std::string> qualnames;
    for (const auto& d : fx.definitions) qualnames.push_back(d.qualname);
    EXPECT_EQ(qualnames, (std::vector<std::string>{"Base", "Base.save", "User", "User.__init__", "User.display"}));

    const auto& display = fx.definitions[4];
    EXPECT_EQ(display.kind, "function");
    EXPECT_TRUE(display.parent_is_class);
    EXPECT_EQ(display.parent_qualname, "User");
    EXPECT_EQ(display.complexity, 2);
    EXPECT_EQ(display.span.start_line, 14);
    EXPECT_EQ(display.signature, "def display(self):");
    EXPECT_EQ(fx.definitions[2].kind, "class");
    EXPECT_EQ(fx.definitions[2].complexity, 1);  // the if inside display does not count for the class
}

TEST(LangGenericDefs, DuplicateNamesAndQuotes) {
    const auto fx = lang_generic::extract_with_queries(python_spec(), "x.py", "def f():\n    pass\n\ndef f():\n    pass\n");
    ASSERT_EQ(fx.definitions.size(), 2u);
    EXPECT_EQ(fx.definitions[1].qualname, "f~2");
    EXPECT_EQ(lang_generic::strip_quotes("'./a'"), "./a");
    EXPECT_EQ(lang_generic::strip_quotes("<stdio.h>"), "stdio.h");
    EXPECT_EQ(lang_generic::strip_quotes("`x`"), "x");
    EXPECT_EQ(lang_generic::strip_quotes("plain"), "plain");
}
