#include <filesystem>
#include <fstream>
#include <sstream>

#ifdef _WIN32
#define NOMINMAX
#include <windows.h>
#else
#include <dlfcn.h>
#endif

#include "pv/core/error.hpp"
#include "pv/core/ids.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"
#include "pv/lang_generic/path_modules.hpp"
#include "pv/plugins/plugins.hpp"

namespace pv::plugins {
namespace {

std::filesystem::path to_path(const std::string& utf8) {
    return std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(utf8.data()), utf8.size()));
}

std::string read_optional(const std::string& path) {
    std::error_code ec;
    if (!std::filesystem::is_regular_file(to_path(path), ec)) return "";
    return core::read_file_text(path);
}

std::string replace_all(std::string s, const std::string& from, const std::string& to) {
    for (std::size_t pos = 0; (pos = s.find(from, pos)) != std::string::npos; pos += to.size()) s.replace(pos, from.size(), to);
    return s;
}

std::vector<std::string> split(const std::string& s, char sep) {
    std::vector<std::string> out;
    std::stringstream ss(s);
    for (std::string part; std::getline(ss, part, sep);) {
        if (!part.empty()) out.push_back(part);
    }
    return out;
}

bool ends_with_segment(const std::string& name, const std::string& tail, char sep) {
    return name == tail || (name.size() > tail.size() && name.compare(name.size() - tail.size(), tail.size(), tail) == 0 &&
                            name[name.size() - tail.size() - 1] == sep);
}

// The shortest known module name that ends with `tail` at a segment boundary ("com.acme.Helper" -> "src.main.kotlin.com.acme.Helper").
std::string module_ending_with(const parse::ProjectIndex& index, const std::string& tail, char sep) {
    std::string best;
    for (const auto& [module, file] : index.module_to_file) {
        if (ends_with_segment(module, tail, sep) && (best.empty() || module.size() < best.size() || (module.size() == best.size() && module < best))) {
            best = module;
        }
    }
    return best;
}

// Folder names matched by trailing segments (namespaces that follow folders: "App/Util/Helper" -> "src/Util").
std::string best_trailing_folder(const parse::ProjectIndex& index, const std::vector<std::string>& parts) {
    std::string best;
    int best_score = 0;
    for (const auto& [module, file] : index.module_to_file) {
        const auto folder = split(module, '/');
        int score = 0;
        for (auto a = parts.rbegin(), b = folder.rbegin(); a != parts.rend() && b != folder.rend() && *a == *b; ++a, ++b) ++score;
        if (score > best_score || (score == best_score && score > 0 && module.size() < best.size())) {
            best = module;
            best_score = score;
        }
    }
    return best;
}

std::string first_segment(const std::string& spec) {
    const std::size_t cut = spec.find_first_of("./\\:");
    return cut == std::string::npos ? spec : spec.substr(0, cut);
}

}  // namespace

// --- DynamicLibrary ---

DynamicLibrary::DynamicLibrary(const std::string& path) {
#ifdef _WIN32
    handle_ = LoadLibraryW(to_path(path).wstring().c_str());
#else
    handle_ = dlopen(path.c_str(), RTLD_NOW);
#endif
    if (!handle_) throw core::PvError(core::err::Io, "cannot load library: " + path);
}

DynamicLibrary::~DynamicLibrary() {
    if (!handle_) return;
#ifdef _WIN32
    FreeLibrary(static_cast<HMODULE>(handle_));
#else
    dlclose(handle_);
#endif
}

void* DynamicLibrary::symbol(const std::string& name) const {
#ifdef _WIN32
    return reinterpret_cast<void*>(GetProcAddress(static_cast<HMODULE>(handle_), name.c_str()));
#else
    return dlsym(handle_, name.c_str());
#endif
}

// --- PluginAdapter ---

PluginAdapter::PluginAdapter(Manifest manifest, std::unique_ptr<DynamicLibrary> library, lang_generic::QuerySpec spec)
    : manifest_(std::move(manifest)), library_(std::move(library)), spec_(std::move(spec)) {}

parse::FileExtraction PluginAdapter::extract(const std::string& rel_path, const std::string& source) const {
    return lang_generic::extract_with_queries(spec_, rel_path, source);
}

std::vector<std::string> PluginAdapter::module_names(const std::string& rel_path) const {
    const std::string path = core::normalize_path(rel_path);
    if (manifest_.module_naming == "path") return lang_generic::path_module_names(path);
    if (manifest_.module_naming == "directory") {
        const std::string parent = core::path_parent(path);
        return parent.empty() ? std::vector<std::string>{} : std::vector<std::string>{parent};
    }
    const std::string ext = core::path_extension(path);
    return {replace_all(path.substr(0, path.size() - ext.size()), "/", ".")};  // dotted
}

parse::ImportTarget PluginAdapter::resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                                  const parse::ProjectIndex& index) const {
    const std::string& spec = imp.module;
    if (spec.empty() || manifest_.resolution == "none") return {};
    auto module_target = [&](const std::string& file) -> parse::ImportTarget {
        if (!imp.name.empty() && imp.name != "*") {
            if (const auto symbol = index.symbol_id(file, imp.name)) return {*symbol, ""};
        }
        return {core::make_node_id(core::NodeKind::Module, file, ""), ""};
    };

    if (manifest_.resolution == "relative_path") {
        const bool relative = spec.rfind("./", 0) == 0 || spec.rfind("../", 0) == 0;
        // Also try bare paths next to the importer (Ruby's require_relative "helper" has no "./").
        const std::string base = lang_generic::resolve_relative_path(importer_file, relative ? spec : "./" + spec, manifest_.extensions);
        if (const auto file = index.file_for_module(base)) return module_target(*file);
        if (relative) return {};
        return {"", lang_generic::external_package_name(spec)};
    }

    if (manifest_.resolution == "dotted") {
        if (const auto file = index.file_for_module(spec)) return module_target(*file);
        const std::size_t dot = spec.rfind('.');
        if (dot != std::string::npos) {
            if (const auto file = index.file_for_module(spec.substr(0, dot))) {
                if (const auto symbol = index.symbol_id(*file, spec.substr(dot + 1))) return {*symbol, ""};
                return module_target(*file);
            }
        }
        const std::string by_tail = module_ending_with(index, spec, '.');  // files under src/main/kotlin/... and similar
        if (!by_tail.empty()) {
            if (const auto file = index.file_for_module(by_tail)) return module_target(*file);
        }
        return {"", first_segment(spec)};
    }

    // suffix
    const std::string path = replace_all(replace_all(spec, "\\", "/"), "::", "/");
    std::string found = lang_generic::longest_suffix_module(index, path);
    if (found.empty()) found = module_ending_with(index, path, '/');
    if (found.empty()) {
        std::vector<std::string> parts = split(path, '/');
        found = best_trailing_folder(index, parts);
        if (found.empty() && parts.size() > 1) {
            parts.pop_back();  // "App/Util/Helper": the class name, then its namespace
            found = best_trailing_folder(index, parts);
        }
    }
    if (!found.empty()) {
        if (manifest_.module_naming == "directory") return {core::make_node_id(core::NodeKind::Package, found, ""), ""};
        if (const auto file = index.file_for_module(found)) return module_target(*file);
    }
    return {"", first_segment(path)};
}

// --- load_plugin ---

std::unique_ptr<parse::LanguageAdapter> load_plugin(const std::string& dir) {
    const std::string manifest_path = core::path_join(dir, "language.json");
    nlohmann::json j;
    try {
        j = nlohmann::json::parse(core::read_file_text(manifest_path));
    } catch (const nlohmann::json::parse_error& e) {
        throw core::PvError(core::err::InvalidParams, "language.json is not valid JSON: " + std::string(e.what()));
    }
    Manifest m = parse_manifest(j, dir);
    auto library = std::make_unique<DynamicLibrary>(core::path_join(dir, m.library));
    using LanguageFn = const TSLanguage* (*)();
    const auto fn = reinterpret_cast<LanguageFn>(library->symbol(m.symbol));
    if (!fn) throw core::PvError(core::err::InvalidParams, "language.json: symbol: " + m.symbol + " not found in " + m.library);

    lang_generic::QuerySpec spec;
    spec.language_id = m.id;
    spec.language = fn();
    spec.definitions_query = read_optional(core::path_join(dir, "definitions.scm"));
    spec.imports_query = read_optional(core::path_join(dir, "imports.scm"));
    spec.calls_query = read_optional(core::path_join(dir, "calls.scm"));
    spec.inherits_query = read_optional(core::path_join(dir, "inherits.scm"));
    spec.decision_node_types = m.decision_node_types;
    spec.require_function = m.require_function;
    if (spec.definitions_query.empty()) throw core::PvError(core::err::InvalidParams, "definitions.scm is missing or empty");
    return std::make_unique<PluginAdapter>(std::move(m), std::move(library), std::move(spec));
}

}  // namespace pv::plugins
