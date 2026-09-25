#include <gtest/gtest.h>

#include "pv/lang_rust/rust.hpp"
#include "pv/parse/query.hpp"

using namespace pv;
using namespace pv::lang_rust;

TEST(LangRustQueries, AllCompile) {
    for (const char* q : {kRustDefinitions, kRustImports, kRustCalls, kRustImpls}) {
        EXPECT_NO_THROW(parse::TsQuery(tree_sitter_rust(), q)) << q;
    }
}
