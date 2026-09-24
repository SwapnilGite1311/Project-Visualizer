#include <gtest/gtest.h>

#include "pv/lang_python/internal.hpp"

using pv::lang_python::resolve_relative_module;

TEST(LangPyRelative, Resolves) {
    EXPECT_EQ(resolve_relative_module("app/services.py", ".models"), "app.models");
    EXPECT_EQ(resolve_relative_module("app/services.py", "."), "app");
    EXPECT_EQ(resolve_relative_module("app/api/routes.py", "..services"), "app.services");
    EXPECT_EQ(resolve_relative_module("app/api/routes.py", "...x"), "");
    EXPECT_EQ(resolve_relative_module("app/services.py", "..x"), "");
    EXPECT_EQ(resolve_relative_module("app/api/__init__.py", ".routes"), "app.api.routes");
    EXPECT_EQ(resolve_relative_module("main.py", ".utils"), "utils");
    EXPECT_EQ(resolve_relative_module("src/app/services.py", ".models"), "app.models");
}
