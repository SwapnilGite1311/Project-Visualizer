#include <gtest/gtest.h>

#include "pv/lang_java/java.hpp"

using namespace pv;

namespace {

parse::RawImport imp(const std::string& module, const std::string& name = "") {
    parse::RawImport i;
    i.module = module;
    i.name = name;
    return i;
}

}  // namespace

TEST(LangJavaResolve, ModuleNames) {
    EXPECT_EQ(lang_java::java_module_names("src/main/java/com/acme/App.java"), std::vector<std::string>{"com.acme.App"});
    EXPECT_EQ(lang_java::java_module_names("src/com/acme/App.java"), std::vector<std::string>{"com.acme.App"});
    EXPECT_EQ(lang_java::java_module_names("App.java"), std::vector<std::string>{"App"});
}

TEST(LangJavaResolve, ProjectClassesAndExternals) {
    parse::ProjectIndex index;
    const std::string helper = "src/main/java/com/acme/util/Helper.java";
    index.add_module_name("com.acme.util.Helper", helper);
    index.add_symbol(helper, "Helper", "class:" + helper + "#Helper");
    index.add_symbol(helper, "Helper.version", "method:" + helper + "#Helper.version");

    EXPECT_EQ(lang_java::resolve_java_import(imp("com.acme.util.Helper"), "", index).node_id, "class:" + helper + "#Helper");
    EXPECT_EQ(lang_java::resolve_java_import(imp("com.acme.util.Helper.version"), "", index).node_id, "class:" + helper + "#Helper");
    EXPECT_TRUE(lang_java::resolve_java_import(imp("com.acme.model", "*"), "", index).node_id.empty());
    EXPECT_TRUE(lang_java::resolve_java_import(imp("com.acme.missing.Thing"), "", index).external_name.empty());
    EXPECT_EQ(lang_java::resolve_java_import(imp("java.util.List"), "", index).external_name, "java");
    EXPECT_EQ(lang_java::resolve_java_import(imp("org.springframework.web.Bind"), "", index).external_name, "org.springframework");
}
