#include <gtest/gtest.h>

#include "pv/lang_python/internal.hpp"
#include "pv/parse/ts.hpp"

using namespace pv;
using namespace pv::lang_python;

namespace {

bool guard(const std::string& source) {
    parse::TsParser parser(tree_sitter_python());
    const parse::TsTree tree = parser.parse(source);
    return has_main_guard(tree.root(), source);
}

}  // namespace

TEST(LangPyMainGuard, Detects) {
    EXPECT_TRUE(guard("if __name__ == \"__main__\":\n    main()\n"));
    EXPECT_TRUE(guard("if __name__=='__main__':\n    pass\n"));
    EXPECT_TRUE(guard("if \"__main__\" == __name__:\n    pass\n"));
    EXPECT_FALSE(guard("if x:\n    pass\n"));
    EXPECT_FALSE(guard("def f():\n    if __name__ == \"__main__\":\n        pass\n"));
}
