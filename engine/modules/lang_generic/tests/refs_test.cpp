#include <gtest/gtest.h>

#include <algorithm>

#include "pv/core/text.hpp"
#include "pv/lang_generic/query_extractor.hpp"

extern "C" const TSLanguage* tree_sitter_python(void);

using namespace pv;

namespace {

std::string fixture(const std::string& rel) {
    return core::read_file_text(std::string(PV_ENGINE_SOURCE_DIR) + "/modules/lang_python/tests/fixtures/pyproj_small/" + rel);
}

lang_generic::QuerySpec spec() {
    lang_generic::QuerySpec s;
    s.language_id = "python";
    s.language = tree_sitter_python();
    s.definitions_query =
        "(class_definition name: (identifier) @name) @definition.class "
        "(function_definition name: (identifier) @name) @definition.function";
    s.imports_query = "(import_from_statement module_name: (_) @import.module name: (dotted_name) @import.name)";
    s.calls_query =
        "(call function: (identifier) @call.name) "
        "(call function: (attribute object: (_) @call.object attribute: (identifier) @call.name))";
    s.inherits_query = "(class_definition name: (identifier) @inherit.class superclasses: (argument_list (identifier) @inherit.base))";
    return s;
}

}  // namespace

TEST(LangGenericRefs, ImportsAndCalls) {
    const auto fx = lang_generic::extract_with_queries(spec(), "app/services.py", fixture("app/services.py"));
    ASSERT_EQ(fx.imports.size(), 4u);
    EXPECT_EQ(fx.imports[0].module, ".models");
    EXPECT_EQ(fx.imports[0].name, "User");
    EXPECT_EQ(fx.imports[1].module, ".utils");
    EXPECT_EQ(fx.imports[1].name, "normalize");
    EXPECT_EQ(fx.imports[2].name, "is_valid");
    EXPECT_EQ(fx.imports[3].module, ".");
    EXPECT_EQ(fx.imports[3].name, "utils");
    EXPECT_EQ(fx.imports[0].line, 2);
    EXPECT_EQ(fx.imports[0].scope_qualname, "");

    ASSERT_EQ(fx.calls.size(), 7u);
    EXPECT_EQ(fx.calls[0].name, "is_valid");
    EXPECT_EQ(fx.calls[0].caller_qualname, "UserService.get_user");
    EXPECT_EQ(fx.calls[0].line, 9);
    const auto dotted = std::find_if(fx.calls.begin(), fx.calls.end(), [](const auto& c) { return c.name == "format_user"; });
    ASSERT_NE(dotted, fx.calls.end());
    EXPECT_EQ(dotted->object, "self");
}

TEST(LangGenericRefs, Inheritance) {
    const auto fx = lang_generic::extract_with_queries(spec(), "app/models.py", fixture("app/models.py"));
    ASSERT_EQ(fx.inherits.size(), 1u);
    EXPECT_EQ(fx.inherits[0].class_qualname, "User");
    EXPECT_EQ(fx.inherits[0].base, "Base");
    EXPECT_EQ(fx.inherits[0].line, 9);
}

TEST(LangGenericRefs, RequireFilter) {
    lang_generic::QuerySpec s = spec();
    s.imports_query = "(call function: (identifier) @import.require_fn arguments: (argument_list (string) @import.module))";
    s.require_function = "require";
    const auto fx = lang_generic::extract_with_queries(s, "x.py", "a = require('lodash')\nb = load('other')\n");
    ASSERT_EQ(fx.imports.size(), 1u);
    EXPECT_EQ(fx.imports[0].module, "lodash");
}
