#include <gtest/gtest.h>

#include <tuple>

#include "py_test_util.hpp"

using namespace pv;
using namespace pv::lang_python;
using Imp = std::tuple<std::string, std::string, std::string, int>;

namespace {

std::vector<Imp> imports_of(const std::string& source) {
    std::vector<Imp> out;
    for (const parse::RawImport& i : lang_python::testing::walk_source(source).imports) {
        out.emplace_back(i.module, i.name, i.alias, i.line);
    }
    return out;
}

}  // namespace

TEST(LangPyWalkerImports, Fixtures) {
    EXPECT_EQ(imports_of(lang_python::testing::fixture("app/services.py")),
              (std::vector<Imp>{{".models", "User", "", 2},
                                {".utils", "normalize", "", 3},
                                {".utils", "is_valid", "", 3},
                                {".", "utils", "", 4}}));
    EXPECT_EQ(imports_of(lang_python::testing::fixture("app/api/routes.py")),
              (std::vector<Imp>{{"app.services", "UserService", "", 2}, {"app.utils", "", "u", 3}}));
}

TEST(LangPyWalkerImports, WildcardAndScope) {
    EXPECT_EQ(imports_of("from os import *\n"), (std::vector<Imp>{{"os", "*", "", 1}}));
    const parse::FileExtraction fx = lang_python::testing::walk_source("def f():\n    import json\n");
    ASSERT_EQ(fx.imports.size(), 1u);
    EXPECT_EQ(fx.imports[0].scope_qualname, "f");
}
