#include <gtest/gtest.h>

#include <algorithm>

#include "plugin_fixture.hpp"
#include "pv/core/error.hpp"
#include "pv/plugins/plugins.hpp"
#include "pv/session/registry.hpp"
#include "pv/rpc/cli_table.hpp"
#include "pv/rpc/method_table.hpp"
#include "pv/session/project_manager.hpp"

void pv_register_plugins(pv::session::Registry& reg);

using namespace pv;
using namespace pv::plugins::testing;

TEST(PluginLoader, AFolderBecomesALanguage) {
    PluginDir p;
    const auto adapter = plugins::load_plugin(p.path());
    EXPECT_EQ(adapter->id(), "pyplug");
    EXPECT_EQ(adapter->extensions(), std::vector<std::string>{".pyx"});
    EXPECT_EQ(adapter->self_keyword(), "self");

    const auto fx = adapter->extract("pkg/shapes.pyx", "import os.path\nclass A:\n    def f(self):\n        if x:\n            helper()\n        pass\n");
    std::vector<std::string> names;
    for (const auto& d : fx.definitions) names.push_back(d.qualname);
    EXPECT_EQ(names, (std::vector<std::string>{"A", "A.f"}));
    const auto f = std::find_if(fx.definitions.begin(), fx.definitions.end(), [](const auto& d) { return d.qualname == "A.f"; });
    EXPECT_TRUE(f->parent_is_class);
    EXPECT_EQ(f->complexity, 2);
    ASSERT_EQ(fx.imports.size(), 1u);
    EXPECT_EQ(fx.imports[0].module, "os.path");
    ASSERT_EQ(fx.calls.size(), 1u);
    EXPECT_EQ(fx.calls[0].caller_qualname, "A.f");
    EXPECT_EQ(adapter->module_names("pkg/shapes.pyx"), std::vector<std::string>{"pkg.shapes"});
}

TEST(PluginLoader, DottedResolution) {
    PluginDir p;
    const auto adapter = plugins::load_plugin(p.path());
    parse::ProjectIndex index;
    for (const std::string file : {"pkg/shapes.pyx", "src/main/app/util.pyx"}) {
        for (const auto& m : adapter->module_names(file)) index.add_module_name(m, file);
    }
    index.add_symbol("pkg/shapes.pyx", "Square", "class:pkg/shapes.pyx#Square");
    parse::RawImport imp;
    imp.module = "pkg.shapes";
    EXPECT_EQ(adapter->resolve_import(imp, "main.pyx", index).node_id, "module:pkg/shapes.pyx");
    imp.module = "pkg.shapes.Square";
    EXPECT_EQ(adapter->resolve_import(imp, "main.pyx", index).node_id, "class:pkg/shapes.pyx#Square");
    imp.module = "app.util";  // the file lives under src/main/
    EXPECT_EQ(adapter->resolve_import(imp, "main.pyx", index).node_id, "module:src/main/app/util.pyx");
    imp.module = "numpy.linalg";
    EXPECT_EQ(adapter->resolve_import(imp, "main.pyx", index).external_name, "numpy");
}

TEST(PluginLoader, ErrorsAreClear) {
    PluginDir p;
    p.write("language.json", "{ not json");
    EXPECT_THROW(plugins::load_plugin(p.path()), core::PvError);
    nlohmann::json bad_symbol = python_manifest(p.library);
    bad_symbol["symbol"] = "tree_sitter_klingon";
    p.write("language.json", bad_symbol.dump());
    try {
        plugins::load_plugin(p.path());
        FAIL() << "expected an error";
    } catch (const core::PvError& e) {
        EXPECT_NE(std::string(e.what()).find("tree_sitter_klingon"), std::string::npos);
    }
    EXPECT_THROW(plugins::DynamicLibrary("C:/no/such/library.dll"), core::PvError);
}

TEST(PluginLoader, LoadedAtStartupFromThePluginRoots) {
    PluginDir p;
    stdfs::create_directories(p.root / "broken");
    std::ofstream(p.root / "broken" / "language.json") << R"({"id": "broken"})";  // skipped with a warning
    stdfs::create_directories(p.root / "not-a-plugin");                            // no language.json: ignored
    const std::string root = generic(p.root);
#ifdef _WIN32
    _putenv_s("PV_LANG_PLUGINS_DIR", root.c_str());
#else
    setenv("PV_LANG_PLUGINS_DIR", root.c_str(), 1);
#endif
    rpc::MethodTable methods;
    rpc::CliTable cli;
    parse::AdapterRegistry adapters;
    rpc::RecordingNotifier notifier;
    session::ProjectManager projects(adapters, notifier);
    session::Registry reg{methods, cli, projects, adapters, notifier, [] {}};
    EXPECT_NO_THROW(pv_register_plugins(reg));
    ASSERT_NE(adapters.by_id("pyplug"), nullptr);
    EXPECT_EQ(adapters.for_extension(".pyx"), adapters.by_id("pyplug"));
    EXPECT_EQ(adapters.by_id("broken"), nullptr);
    EXPECT_NO_THROW(pv_register_plugins(reg));  // loading the same plugin twice is refused by the registry, not fatal
#ifdef _WIN32
    _putenv_s("PV_LANG_PLUGINS_DIR", "");
#else
    unsetenv("PV_LANG_PLUGINS_DIR");
#endif
}
