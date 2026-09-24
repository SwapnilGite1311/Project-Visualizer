#include <gtest/gtest.h>

#include <map>

#include "pv/lang_python/python_adapter.hpp"
#include "py_test_util.hpp"

using namespace pv;
using namespace pv::lang_python;

TEST(LangPyFixture, AllFiles) {
    const std::map<std::string, int> expected_loc = {
        {"main.py", 15},         {"app/__init__.py", 1},     {"app/models.py", 17}, {"app/utils.py", 9},
        {"app/services.py", 15}, {"app/api/__init__.py", 0}, {"app/api/routes.py", 10}, {"broken.py", 5}};
    std::size_t definitions = 0;
    std::size_t imports = 0;
    std::size_t inherits = 0;
    std::vector<std::string> syntax_errors;
    std::vector<std::string> main_guards;
    std::map<std::string, std::size_t> imports_per_file;
    for (const auto& [rel, loc] : expected_loc) {
        const parse::FileExtraction fx = PythonAdapter().extract(rel, lang_python::testing::fixture(rel));
        EXPECT_EQ(fx.loc, loc) << rel;
        definitions += fx.definitions.size();
        imports += fx.imports.size();
        inherits += fx.inherits.size();
        imports_per_file[rel] = fx.imports.size();
        if (fx.has_syntax_errors) syntax_errors.push_back(rel);
        if (fx.has_main_guard) main_guards.push_back(rel);
    }
    EXPECT_EQ(definitions, 13u);
    EXPECT_EQ(imports, 8u);
    EXPECT_EQ(imports_per_file["main.py"], 2u);
    EXPECT_EQ(imports_per_file["app/services.py"], 4u);
    EXPECT_EQ(imports_per_file["app/api/routes.py"], 2u);
    EXPECT_EQ(inherits, 1u);
    EXPECT_EQ(syntax_errors, (std::vector<std::string>{"broken.py"}));
    EXPECT_EQ(main_guards, (std::vector<std::string>{"main.py"}));
}
