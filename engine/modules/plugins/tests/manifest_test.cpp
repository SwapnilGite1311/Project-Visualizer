#include <gtest/gtest.h>

#include "plugin_fixture.hpp"
#include "pv/core/error.hpp"
#include "pv/plugins/plugins.hpp"

using namespace pv;
using namespace pv::plugins::testing;

namespace {

// The error message of parse_manifest for a manifest with one field changed (or removed with a null value).
std::string error_for(const PluginDir& p, const std::string& field, const nlohmann::json& value) {
    nlohmann::json j = python_manifest(p.library);
    if (value.is_null()) j.erase(field);
    else j[field] = value;
    try {
        plugins::parse_manifest(j, p.path());
    } catch (const core::PvError& e) {
        return e.what();
    }
    return "";
}

}  // namespace

TEST(PluginManifest, ValidManifest) {
    PluginDir p;
    const auto m = plugins::parse_manifest(python_manifest(p.library), p.path());
    EXPECT_EQ(m.id, "pyplug");
    EXPECT_EQ(m.extensions, std::vector<std::string>{".pyx"});
    EXPECT_EQ(m.symbol, "tree_sitter_python");
    EXPECT_EQ(m.self_keyword, "self");
    EXPECT_EQ(m.require_function, "");
    EXPECT_EQ(m.decision_node_types.size(), 2u);

    nlohmann::json minimal = python_manifest(p.library);
    minimal.erase("self_keyword");
    minimal.erase("decision_node_types");
    minimal["extensions"] = {".PYX"};
    const auto d = plugins::parse_manifest(minimal, p.path());
    EXPECT_EQ(d.self_keyword, "this");  // default
    EXPECT_EQ(d.extensions, std::vector<std::string>{".pyx"});  // lower-cased
}

TEST(PluginManifest, EachInvalidFieldIsNamed) {
    PluginDir p;
    const std::vector<std::tuple<std::string, nlohmann::json>> cases = {
        {"id", "Py-Plug"},         {"id", nullptr},        {"extensions", nlohmann::json::array()},
        {"extensions", {"pyx"}},   {"extensions", "pyx"},   {"library", "missing.dll"},
        {"library", "../x.dll"},   {"symbol", "python"},    {"module_naming", "flat"},
        {"resolution", "magic"},   {"self_keyword", 3},     {"decision_node_types", "if"},
    };
    for (const auto& [field, value] : cases) {
        const std::string message = error_for(p, field, value);
        EXPECT_NE(message.find(field), std::string::npos) << field << " = " << value.dump() << " -> " << message;
    }
    EXPECT_THROW(plugins::parse_manifest("not an object", p.path()), core::PvError);
}

TEST(PluginManifest, Roots) {
#ifdef _WIN32
    _putenv_s("PV_LANG_PLUGINS_DIR", "C:/a;C:/b");
    EXPECT_EQ(plugins::plugin_roots(), (std::vector<std::string>{"C:/a", "C:/b"}));
    _putenv_s("PV_LANG_PLUGINS_DIR", "");
#else
    setenv("PV_LANG_PLUGINS_DIR", "/a:/b", 1);
    EXPECT_EQ(plugins::plugin_roots(), (std::vector<std::string>{"/a", "/b"}));
    unsetenv("PV_LANG_PLUGINS_DIR");
#endif
    const auto defaults = plugins::plugin_roots();
    ASSERT_EQ(defaults.size(), 1u);
    EXPECT_NE(defaults[0].find(".project-visualizer/languages"), std::string::npos);
}
