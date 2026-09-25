#include <gtest/gtest.h>

#include "pv/lang_cpp/cpp.hpp"
#include "pv/parse/query.hpp"

using namespace pv;
using namespace pv::lang_cpp;

TEST(LangCppQueries, CQueriesCompile) {
    for (const char* q : {kCDefinitions, kIncludes, kCCalls}) {
        EXPECT_NO_THROW(parse::TsQuery(tree_sitter_c(), q)) << q;
    }
}

TEST(LangCppQueries, CppQueriesCompile) {
    for (const char* q : {kCppDefinitions, kIncludes, kCppCalls, kCppInherits}) {
        EXPECT_NO_THROW(parse::TsQuery(tree_sitter_cpp(), q)) << q;
    }
}
