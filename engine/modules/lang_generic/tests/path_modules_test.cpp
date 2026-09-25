#include <gtest/gtest.h>

#include "pv/lang_generic/path_modules.hpp"

using namespace pv;
using Strings = std::vector<std::string>;

TEST(LangGenericPaths, ModuleNames) {
    EXPECT_EQ(lang_generic::path_module_names("src/a/b.ts"), Strings{"src/a/b"});
    EXPECT_EQ(lang_generic::path_module_names("src/a/index.js"), (Strings{"src/a/index", "src/a"}));
    EXPECT_EQ(lang_generic::path_module_names("index.js"), Strings{"index"});
}

TEST(LangGenericPaths, RelativeImports) {
    const Strings js{".js", ".ts", ".jsx", ".tsx"};
    EXPECT_EQ(lang_generic::resolve_relative_path("src/a/m.js", "./x.js", js), "src/a/x");
    EXPECT_EQ(lang_generic::resolve_relative_path("src/a/m.js", "../lib/y", js), "src/lib/y");
    EXPECT_EQ(lang_generic::resolve_relative_path("src/a/m.js", "./data.json", js), "src/a/data.json");
}

TEST(LangGenericPaths, SuffixModulesAndPackages) {
    parse::ProjectIndex index;
    index.add_module_name("internal/store", "internal/store/store.go");
    index.add_module_name("store", "store/store.go");
    EXPECT_EQ(lang_generic::longest_suffix_module(index, "github.com/acme/shop/internal/store"), "internal/store");
    EXPECT_EQ(lang_generic::longest_suffix_module(index, "store"), "store");
    EXPECT_EQ(lang_generic::longest_suffix_module(index, "github.com/acme/other"), "");

    EXPECT_EQ(lang_generic::external_package_name("@scope/pkg/sub"), "@scope/pkg");
    EXPECT_EQ(lang_generic::external_package_name("lodash/fp"), "lodash");
    EXPECT_EQ(lang_generic::external_package_name("lodash"), "lodash");
    EXPECT_EQ(lang_generic::external_package_name("node:fs"), "node:fs");
}
