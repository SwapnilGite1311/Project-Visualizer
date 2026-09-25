#include <gtest/gtest.h>

#include "pv/lang_cpp/cpp.hpp"

using namespace pv;

namespace {

parse::ProjectIndex sample_index() {
    parse::ProjectIndex index;
    for (const std::string file : {"src/util.h", "src/shape.cpp", "lib/inc/a.h"}) {
        for (const std::string& m : lang_cpp::c_module_names(file)) index.add_module_name(m, file);
    }
    return index;
}

parse::RawImport include(const std::string& spec) {
    parse::RawImport i;
    i.module = spec;
    return i;
}

}  // namespace

TEST(LangCppResolve, ModuleNamesKeepTheExtension) {
    EXPECT_EQ(lang_cpp::c_module_names("src/util.h"), std::vector<std::string>{"src/util.h"});
}

TEST(LangCppResolve, IncludesBecomeModulesOrExternals) {
    const auto index = sample_index();
    EXPECT_EQ(lang_cpp::resolve_include(include("util.h"), "src/shape.cpp", index).node_id, "module:src/util.h");
    EXPECT_EQ(lang_cpp::resolve_include(include("../src/util.h"), "lib/x.cpp", index).node_id, "module:src/util.h");
    EXPECT_EQ(lang_cpp::resolve_include(include("inc/a.h"), "src/shape.cpp", index).node_id, "module:lib/inc/a.h");  // by suffix

    const auto iostream = lang_cpp::resolve_include(include("iostream"), "src/main.cpp", index);
    EXPECT_TRUE(iostream.node_id.empty());
    EXPECT_EQ(iostream.external_name, "iostream");
    EXPECT_EQ(lang_cpp::resolve_include(include("stdio.h"), "src/a.c", index).external_name, "stdio");

    const auto unknown = lang_cpp::resolve_include(include("missing.h"), "src/shape.cpp", index);
    EXPECT_TRUE(unknown.node_id.empty());
    EXPECT_TRUE(unknown.external_name.empty());
}
