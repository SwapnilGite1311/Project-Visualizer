#include <gtest/gtest.h>

#include "pv/lang_rust/rust.hpp"

using namespace pv;

namespace {

parse::ProjectIndex sample_index() {
    parse::ProjectIndex index;
    for (const std::string file : {"src/main.rs", "src/store.rs", "src/api/mod.rs", "src/api/routes.rs"}) {
        for (const std::string& m : lang_rust::rust_module_names(file)) index.add_module_name(m, file);
    }
    index.add_symbol("src/store.rs", "Store", "class:src/store.rs#Store");
    index.add_symbol("src/api/routes.rs", "list", "function:src/api/routes.rs#list");
    return index;
}

parse::RawImport use(const std::string& module, const std::string& name = "") {
    parse::RawImport i;
    i.module = module;
    i.name = name;
    return i;
}

}  // namespace

TEST(LangRustResolve, ModuleNames) {
    using V = std::vector<std::string>;
    EXPECT_EQ(lang_rust::rust_module_names("src/main.rs"), V{"crate"});
    EXPECT_EQ(lang_rust::rust_module_names("src/lib.rs"), V{"crate"});
    EXPECT_EQ(lang_rust::rust_module_names("src/api/mod.rs"), V{"crate::api"});
    EXPECT_EQ(lang_rust::rust_module_names("src/api/routes.rs"), V{"crate::api::routes"});
    EXPECT_EQ(lang_rust::rust_module_names("tests/it.rs"), V{"tests::it"});
}

TEST(LangRustResolve, UsePathsAndModDeclarations) {
    const auto index = sample_index();
    EXPECT_EQ(lang_rust::resolve_rust_import(use("crate::store", "Store"), "src/main.rs", index).node_id, "class:src/store.rs#Store");
    EXPECT_EQ(lang_rust::resolve_rust_import(use("store"), "src/main.rs", index).node_id, "module:src/store.rs");  // mod store;
    EXPECT_EQ(lang_rust::resolve_rust_import(use("routes"), "src/api/mod.rs", index).node_id, "module:src/api/routes.rs");
    EXPECT_EQ(lang_rust::resolve_rust_import(use("crate", "store"), "src/api/routes.rs", index).node_id, "module:src/store.rs");
    EXPECT_EQ(lang_rust::resolve_rust_import(use("self::routes", "list"), "src/api/mod.rs", index).node_id,
              "function:src/api/routes.rs#list");
    EXPECT_EQ(lang_rust::resolve_rust_import(use("super::super", "store"), "src/api/routes.rs", index).node_id, "module:src/store.rs");
    EXPECT_EQ(lang_rust::resolve_rust_import(use("store", "Store"), "src/main.rs", index).node_id, "class:src/store.rs#Store");  // 2015 style

    const auto std_import = lang_rust::resolve_rust_import(use("std::collections", "HashMap"), "src/main.rs", index);
    EXPECT_TRUE(std_import.node_id.empty());
    EXPECT_EQ(std_import.external_name, "std");
    const auto missing = lang_rust::resolve_rust_import(use("crate::nothing", "X"), "src/main.rs", index);
    EXPECT_TRUE(missing.node_id.empty());
    EXPECT_TRUE(missing.external_name.empty());
}
