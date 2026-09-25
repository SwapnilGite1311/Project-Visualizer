#include <gtest/gtest.h>

#include <algorithm>

#include "pv/lang_csharp/csharp.hpp"
#include "pv/parse/query.hpp"

using namespace pv;
using namespace pv::lang_csharp;

namespace {

parse::RawImport using_ns(const std::string& ns) {
    parse::RawImport i;
    i.module = ns;
    return i;
}

}  // namespace

TEST(LangCsharpBasics, QueriesCompile) {
    for (const char* q : {kCsDefinitions, kCsImports, kCsCalls, kCsInherits}) {
        EXPECT_NO_THROW(parse::TsQuery(tree_sitter_c_sharp(), q)) << q;
    }
}

TEST(LangCsharpBasics, NamespacesMapToFolders) {
    EXPECT_EQ(csharp_module_names("src/Util/Helper.cs"), std::vector<std::string>{"src/Util"});
    EXPECT_TRUE(csharp_module_names("Program.cs").empty());

    parse::ProjectIndex index;
    for (const std::string file : {"src/App/Program.cs", "src/Util/Helper.cs", "src/App/Models/User.cs", "tests/Util/HelperTests.cs"}) {
        for (const std::string& m : csharp_module_names(file)) index.add_module_name(m, file);
    }
    EXPECT_EQ(resolve_csharp_import(using_ns("Acme.Util"), "src/App/Program.cs", index).node_id, "package:src/Util");  // shortest wins
    EXPECT_EQ(resolve_csharp_import(using_ns("Acme.App.Models"), "src/App/Program.cs", index).node_id, "package:src/App/Models");
    const auto system = resolve_csharp_import(using_ns("System.Collections.Generic"), "src/App/Program.cs", index);
    EXPECT_TRUE(system.node_id.empty());
    EXPECT_EQ(system.external_name, "System");
}

TEST(LangCsharpBasics, Extraction) {
    const CSharpAdapter cs;
    const auto fx = cs.extract("src/Shop/Cart.cs",
                               "using System.Linq;\n"
                               "namespace Shop;\n"
                               "public record Item(string Name);\n"
                               "public class Cart : Base {\n"
                               "    public Cart() { Reset(); }\n"
                               "    void Reset() { foreach (var i in items) { if (i != null) Log(i); } }\n"
                               "}\n");
    const auto names = [&] {
        std::vector<std::string> out;
        for (const auto& d : fx.definitions) out.push_back(d.qualname);
        return out;
    }();
    EXPECT_NE(std::find(names.begin(), names.end(), "Item"), names.end());
    EXPECT_NE(std::find(names.begin(), names.end(), "Cart.Cart"), names.end());
    const auto reset = std::find_if(fx.definitions.begin(), fx.definitions.end(), [](const auto& d) { return d.qualname == "Cart.Reset"; });
    ASSERT_NE(reset, fx.definitions.end());
    EXPECT_EQ(reset->complexity, 3);
    ASSERT_EQ(fx.imports.size(), 1u);
    EXPECT_EQ(fx.imports[0].module, "System.Linq");
    ASSERT_EQ(fx.inherits.size(), 1u);
    EXPECT_EQ(fx.inherits[0].base, "Base");
}
