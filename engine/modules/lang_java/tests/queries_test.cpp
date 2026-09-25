#include <gtest/gtest.h>

#include "pv/lang_java/java.hpp"
#include "pv/parse/query.hpp"

using namespace pv;

TEST(LangJavaQueries, AllCompile) {
    for (const char* q : {lang_java::kJavaDefinitions, lang_java::kJavaImports, lang_java::kJavaCalls, lang_java::kJavaInherits}) {
        EXPECT_NO_THROW(parse::TsQuery(tree_sitter_java(), q)) << q;
    }
}
