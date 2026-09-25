#include <gtest/gtest.h>

#include "pv/lang_go/go.hpp"
#include "pv/parse/query.hpp"

using namespace pv;

TEST(LangGoQueries, AllCompile) {
    for (const char* q : {lang_go::kGoDefinitions, lang_go::kGoImports, lang_go::kGoCalls, lang_go::kGoReceivers}) {
        EXPECT_NO_THROW(parse::TsQuery(tree_sitter_go(), q)) << q;
    }
}
