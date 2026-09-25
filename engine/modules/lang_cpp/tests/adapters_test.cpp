#include <gtest/gtest.h>

#include <algorithm>

#include "pv/lang_cpp/cpp.hpp"

using namespace pv;

namespace {

const parse::RawDefinition* find_def(const parse::FileExtraction& fx, const std::string& qualname) {
    const auto it = std::find_if(fx.definitions.begin(), fx.definitions.end(), [&](const auto& d) { return d.qualname == qualname; });
    return it == fx.definitions.end() ? nullptr : &*it;
}

}  // namespace

TEST(LangCppAdapters, MethodsDefinedOutsideTheirClass) {
    const auto cpp = lang_cpp::make_cpp_adapter();
    EXPECT_EQ(cpp->id(), "cpp");
    const auto fx = cpp->extract("a.cpp", "class A { public: int f(); }; int A::f() { return g(); }\n");
    const auto* f = find_def(fx, "A.f");
    ASSERT_NE(f, nullptr);
    EXPECT_EQ(f->name, "f");
    EXPECT_EQ(f->parent_qualname, "A");
    EXPECT_TRUE(f->parent_is_class);
    ASSERT_EQ(fx.calls.size(), 1u);
    EXPECT_EQ(fx.calls[0].name, "g");
    EXPECT_EQ(fx.calls[0].caller_qualname, "A.f");
}

TEST(LangCppAdapters, ClassInAnotherFileAndNestedNamespaces) {
    const auto cpp = lang_cpp::make_cpp_adapter();
    const auto fx = cpp->extract("b.cpp", "int Shape::area() const { return 1; }\nvoid ns::Store::save() { helper(); }\n");
    const auto* area = find_def(fx, "Shape.area");
    ASSERT_NE(area, nullptr);
    EXPECT_EQ(area->parent_qualname, "");  // Shape is declared elsewhere: a function named Shape.area
    const auto* save = find_def(fx, "Store.save");
    ASSERT_NE(save, nullptr);
    EXPECT_EQ(save->name, "save");
    ASSERT_EQ(fx.calls.size(), 1u);
    EXPECT_EQ(fx.calls[0].caller_qualname, "Store.save");
}

TEST(LangCppAdapters, CFilesAndIncludes) {
    const auto c = lang_cpp::make_c_adapter();
    EXPECT_EQ(c->extensions(), std::vector<std::string>{".c"});
    const auto fx = c->extract("m.c",
                               "#include <stdio.h>\n#include \"util.h\"\n"
                               "struct P { int x; };\n"
                               "int *make(void) { return 0; }\n"
                               "int main(void) { if (1) { printf(\"x\"); } return add(1, 2); }\n");
    ASSERT_EQ(fx.imports.size(), 2u);
    EXPECT_EQ(fx.imports[0].module, "stdio.h");
    EXPECT_EQ(fx.imports[1].module, "util.h");
    EXPECT_NE(find_def(fx, "P"), nullptr);
    EXPECT_NE(find_def(fx, "make"), nullptr);
    const auto* main_fn = find_def(fx, "main");
    ASSERT_NE(main_fn, nullptr);
    EXPECT_EQ(main_fn->complexity, 2);
    EXPECT_EQ(fx.calls.size(), 2u);
}
