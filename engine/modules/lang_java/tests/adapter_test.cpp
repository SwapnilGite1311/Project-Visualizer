#include <gtest/gtest.h>

#include "pv/lang_java/java.hpp"

using namespace pv;

TEST(LangJavaAdapter, ImportsBindSimpleNames) {
    const lang_java::JavaAdapter java;
    const auto fx = java.extract("src/App.java",
                                 "package com.acme;\n"
                                 "import com.acme.util.Helper;\n"
                                 "import com.acme.model.*;\n"
                                 "class App { void run() { new Helper().greet(); } }\n");
    ASSERT_EQ(fx.imports.size(), 2u);
    EXPECT_EQ(fx.imports[0].module, "com.acme.util.Helper");
    EXPECT_EQ(fx.imports[0].alias, "Helper");
    EXPECT_EQ(fx.imports[1].module, "com.acme.model");
    EXPECT_EQ(fx.imports[1].name, "*");
    EXPECT_EQ(fx.imports[1].alias, "");
    ASSERT_EQ(fx.definitions.size(), 2u);
    EXPECT_EQ(fx.definitions[1].qualname, "App.run");
    EXPECT_TRUE(fx.definitions[1].parent_is_class);
}
