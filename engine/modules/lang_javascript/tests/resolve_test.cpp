#include <gtest/gtest.h>

#include "pv/lang_generic/path_modules.hpp"
#include "pv/lang_javascript/resolve.hpp"

using namespace pv;

namespace {

parse::ProjectIndex sample_index() {
    parse::ProjectIndex index;
    for (const std::string file : {"src/index.js", "src/utils/format.js", "src/utils/index.js", "src/api/models.ts"}) {
        for (const std::string& m : lang_generic::path_module_names(file)) index.add_module_name(m, file);
    }
    index.add_symbol("src/utils/format.js", "formatName", "function:src/utils/format.js#formatName");
    return index;
}

parse::RawImport imp(const std::string& module, const std::string& name = "") {
    parse::RawImport i;
    i.module = module;
    i.name = name;
    return i;
}

}  // namespace

TEST(LangJsResolve, RelativeFilesAndSymbols) {
    const auto index = sample_index();
    const auto named = lang_javascript::resolve_js_import(imp("./format.js", "formatName"), "src/utils/x.js", index);
    EXPECT_EQ(named.node_id, "function:src/utils/format.js#formatName");
    const auto dir = lang_javascript::resolve_js_import(imp("./utils", "default"), "src/index.js", index);
    EXPECT_EQ(dir.node_id, "module:src/utils/index.js");
    const auto unknown_symbol = lang_javascript::resolve_js_import(imp("./utils/format", "missing"), "src/index.js", index);
    EXPECT_EQ(unknown_symbol.node_id, "module:src/utils/format.js");
    const auto missing = lang_javascript::resolve_js_import(imp("../api/client"), "src/utils/x.js", index);
    EXPECT_TRUE(missing.node_id.empty());
    EXPECT_TRUE(missing.external_name.empty());
}

TEST(LangJsResolve, PackagesAndAliases) {
    const auto index = sample_index();
    const auto pkg = lang_javascript::resolve_js_import(imp("lodash/fp"), "src/index.js", index);
    EXPECT_EQ(pkg.external_name, "lodash");
    EXPECT_TRUE(pkg.node_id.empty());
    EXPECT_EQ(lang_javascript::resolve_js_import(imp("@scope/pkg/x"), "src/index.js", index).external_name, "@scope/pkg");
    EXPECT_EQ(lang_javascript::resolve_js_import(imp("@/utils/format", "formatName"), "src/api/models.ts", index).node_id,
              "function:src/utils/format.js#formatName");
    EXPECT_EQ(lang_javascript::resolve_js_import(imp("~/api/models.ts"), "src/index.js", index).node_id, "module:src/api/models.ts");
    EXPECT_TRUE(lang_javascript::resolve_js_import(imp("/abs/path"), "src/index.js", index).node_id.empty());
}
