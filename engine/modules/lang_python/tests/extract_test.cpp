#include <gtest/gtest.h>

#include <algorithm>

#include "pv/lang_python/python_adapter.hpp"
#include "py_test_util.hpp"

using namespace pv;
using namespace pv::lang_python;

namespace {

parse::FileExtraction extract_fixture(const std::string& rel) {
    return PythonAdapter().extract(rel, lang_python::testing::fixture(rel));
}

}  // namespace

TEST(LangPyExtract, Main) {
    const parse::FileExtraction fx = extract_fixture("main.py");
    EXPECT_EQ(fx.loc, 15);
    EXPECT_TRUE(fx.has_main_guard);
    EXPECT_EQ(fx.module_docstring, "Entry point of the sample app.");
    ASSERT_EQ(fx.definitions.size(), 1u);
    EXPECT_EQ(fx.definitions[0].name, "main");
}

TEST(LangPyExtract, Broken) {
    const parse::FileExtraction fx = extract_fixture("broken.py");
    EXPECT_TRUE(fx.has_syntax_errors);
    EXPECT_TRUE(std::any_of(fx.definitions.begin(), fx.definitions.end(),
                            [](const parse::RawDefinition& d) { return d.name == "ok_function"; }));
}

TEST(LangPyExtract, EmptyAndModels) {
    const parse::FileExtraction empty = extract_fixture("app/api/__init__.py");
    EXPECT_EQ(empty.loc, 0);
    EXPECT_TRUE(empty.definitions.empty());
    const parse::FileExtraction models = extract_fixture("app/models.py");
    EXPECT_EQ(models.language, "python");
    EXPECT_EQ(models.definitions.size(), 5u);
}
