#include <gtest/gtest.h>

#include "pv/lang_javascript/queries.hpp"
#include "pv/parse/query.hpp"

using namespace pv;
using namespace pv::lang_javascript;

TEST(LangJsQueries, JavaScriptQueriesCompile) {
    for (const char* q : {kJsDefinitions, kJsImports, kJsCalls, kJsInherits}) {
        EXPECT_NO_THROW(parse::TsQuery(tree_sitter_javascript(), q)) << q;
    }
}

TEST(LangJsQueries, TypeScriptQueriesCompile) {
    for (const TSLanguage* lang : {tree_sitter_typescript(), tree_sitter_tsx()}) {
        for (const char* q : {kTsDefinitions, kJsImports, kJsCalls, kTsInherits}) {
            EXPECT_NO_THROW(parse::TsQuery(lang, q)) << q;
        }
    }
}
