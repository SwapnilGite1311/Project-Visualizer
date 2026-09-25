#include <gtest/gtest.h>

#include "pv/lang_go/go.hpp"

using namespace pv;

namespace {

parse::RawImport imp(const std::string& module) {
    parse::RawImport i;
    i.module = module;
    return i;
}

}  // namespace

TEST(LangGoResolve, PackagesAreDirectories) {
    EXPECT_EQ(lang_go::go_module_names("internal/store/store.go"), std::vector<std::string>{"internal/store"});
    EXPECT_TRUE(lang_go::go_module_names("main.go").empty());
}

TEST(LangGoResolve, ImportPaths) {
    parse::ProjectIndex index;
    index.add_module_name("internal/store", "internal/store/store.go");
    EXPECT_EQ(lang_go::resolve_go_import(imp("fmt"), "main.go", index).external_name, "fmt");
    EXPECT_EQ(lang_go::resolve_go_import(imp("net/http"), "main.go", index).external_name, "net");
    EXPECT_EQ(lang_go::resolve_go_import(imp("github.com/acme/shop/internal/store"), "main.go", index).node_id, "package:internal/store");
    EXPECT_EQ(lang_go::resolve_go_import(imp("github.com/other/lib/x"), "main.go", index).external_name, "github.com/other/lib");
    EXPECT_EQ(lang_go::resolve_go_import(imp("golang.org/x/sync/errgroup"), "main.go", index).external_name, "golang.org");
}
