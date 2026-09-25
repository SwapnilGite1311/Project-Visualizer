#pragma once
#include <memory>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/lang_generic/query_extractor.hpp"
#include "pv/parse/adapter.hpp"

namespace pv::plugins {

// A language plugin is a folder: language.json, definitions/imports/calls/inherits.scm and a compiled tree-sitter grammar.
struct Manifest {
    std::string id, library, symbol, module_naming, resolution, self_keyword, require_function, dir;
    std::vector<std::string> extensions, decision_node_types;
};

// Validates language.json; throws PvError(err::InvalidParams, "<field>: <reason>").
Manifest parse_manifest(const nlohmann::json& j, const std::string& dir);

// A shared library (.dll/.so/.dylib), unloaded when the object goes away.
class DynamicLibrary {
public:
    explicit DynamicLibrary(const std::string& path);  // PvError(err::Io, "cannot load library: <path>")
    ~DynamicLibrary();
    DynamicLibrary(const DynamicLibrary&) = delete;
    DynamicLibrary& operator=(const DynamicLibrary&) = delete;
    void* symbol(const std::string& name) const;  // nullptr if missing

private:
    void* handle_ = nullptr;
};

class PluginAdapter : public parse::LanguageAdapter {
public:
    PluginAdapter(Manifest manifest, std::unique_ptr<DynamicLibrary> library, lang_generic::QuerySpec spec);
    std::string id() const override { return manifest_.id; }
    std::vector<std::string> extensions() const override { return manifest_.extensions; }
    parse::FileExtraction extract(const std::string& rel_path, const std::string& source) const override;
    std::vector<std::string> module_names(const std::string& rel_path) const override;
    parse::ImportTarget resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                       const parse::ProjectIndex& index) const override;
    std::string self_keyword() const override { return manifest_.self_keyword; }

private:
    Manifest manifest_;
    std::unique_ptr<DynamicLibrary> library_;  // the grammar's code: kept loaded as long as the adapter lives
    lang_generic::QuerySpec spec_;
};

std::unique_ptr<parse::LanguageAdapter> load_plugin(const std::string& dir);

// PV_LANG_PLUGINS_DIR (several folders separated by ';' on Windows, ':' elsewhere), else ~/.project-visualizer/languages.
std::vector<std::string> plugin_roots();

}  // namespace pv::plugins
