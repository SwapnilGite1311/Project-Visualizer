#include <gtest/gtest.h>

#include "pv/lang_python/internal.hpp"
#include "pv/parse/ts.hpp"

using namespace pv;
using namespace pv::lang_python;

namespace {

int complexity_of(const std::string& source) {
    parse::TsParser parser(tree_sitter_python());
    const parse::TsTree tree = parser.parse(source);
    for (TSNode child : parse::named_children(tree.root())) {
        if (parse::node_type(child) == "function_definition") return compute_complexity(child);
    }
    return -1;
}

}  // namespace

TEST(LangPyComplexity, Counts) {
    EXPECT_EQ(complexity_of("def f():\n    return 1\n"), 1);
    EXPECT_EQ(complexity_of("def f(x):\n    if x:\n        return 1\n    elif x > 2:\n        return 2\n    return 3\n"), 3);
    EXPECT_EQ(complexity_of("def f(a, b):\n    return a and b or a\n"), 3);
    EXPECT_EQ(complexity_of("def f(xs):\n    for x in xs:\n        while x:\n            x -= 1\n"), 3);
    EXPECT_EQ(complexity_of("def f():\n    def g(x):\n        if x:\n            pass\n    return g\n"), 1);
}
