#pragma once
// Test helper: a temporary plugin folder around the test Python grammar library (PV_TEST_GRAMMAR_PATH).
#include <filesystem>
#include <fstream>
#include <random>
#include <string>

#include <nlohmann/json.hpp>

namespace pv::plugins::testing {

namespace stdfs = std::filesystem;

inline std::string generic(const stdfs::path& p) {
    const std::u8string s = p.generic_u8string();
    return std::string(reinterpret_cast<const char*>(s.data()), s.size());
}

inline nlohmann::json python_manifest(const std::string& library) {
    return {{"id", "pyplug"},        {"extensions", {".pyx"}},     {"library", library},
            {"symbol", "tree_sitter_python"}, {"module_naming", "dotted"}, {"resolution", "dotted"},
            {"self_keyword", "self"}, {"decision_node_types", {"if_statement", "for_statement"}}};
}

struct PluginDir {
    stdfs::path root;  // contains the plugin folder "pyplug"
    stdfs::path dir;
    std::string library;

    PluginDir() {
        std::random_device rd;
        root = stdfs::temp_directory_path() / ("pv-plugins-" + std::to_string(rd()) + std::to_string(rd()));
        dir = root / "pyplug";
        stdfs::create_directories(dir);
        const stdfs::path grammar(PV_TEST_GRAMMAR_PATH);
        library = generic(grammar.filename());
        stdfs::copy_file(grammar, dir / grammar.filename());
        write("language.json", python_manifest(library).dump(2));
        write("definitions.scm",
              "(class_definition name: (identifier) @name) @definition.class\n"
              "(function_definition name: (identifier) @name) @definition.function\n");
        write("imports.scm", "(import_statement name: (dotted_name) @import.module)\n");
        write("calls.scm", "(call function: (identifier) @call.name)\n");
    }
    ~PluginDir() {
        std::error_code ec;
        stdfs::remove_all(root, ec);  // may fail while the library is loaded on Windows; the temp folder is cleaned later
    }
    void write(const std::string& name, const std::string& text) const { std::ofstream(dir / name, std::ios::binary) << text; }
    std::string path() const { return generic(dir); }
};

}  // namespace pv::plugins::testing
