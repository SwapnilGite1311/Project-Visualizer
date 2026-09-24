#include <gtest/gtest.h>

#include "pv/lang_python/internal.hpp"

using pv::lang_python::module_names_for;
using V = std::vector<std::string>;

TEST(LangPyModuleNames, FromPaths) {
    EXPECT_EQ(module_names_for("app/models.py"), (V{"app.models"}));
    EXPECT_EQ(module_names_for("src/app/main.py"), (V{"app.main", "src.app.main"}));
    EXPECT_EQ(module_names_for("app/__init__.py"), (V{"app"}));
    EXPECT_EQ(module_names_for("main.py"), (V{"main"}));
    EXPECT_EQ(module_names_for("__init__.py"), (V{}));
    EXPECT_EQ(module_names_for("src/__init__.py"), (V{"src"}));
    EXPECT_EQ(module_names_for("lib/x.pyi"), (V{"x", "lib.x"}));
    EXPECT_EQ(module_names_for("a/b.ipynb"), (V{"a.b"}));
}
