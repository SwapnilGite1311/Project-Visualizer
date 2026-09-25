#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <filesystem>
#include <set>

#include "pv/core/error.hpp"
#include "pv/core/paths.hpp"
#include "pv/plugins/plugins.hpp"

namespace pv::plugins {
namespace {

[[noreturn]] void bad(const std::string& field, const std::string& reason) {
    throw core::PvError(core::err::InvalidParams, "language.json: " + field + ": " + reason);
}

std::string text(const nlohmann::json& j, const std::string& key, bool required, const std::string& fallback = "") {
    if (!j.contains(key) || j[key].is_null()) {
        if (required) bad(key, "is required");
        return fallback;
    }
    if (!j[key].is_string()) bad(key, "must be a string");
    return j[key];
}

std::vector<std::string> list(const nlohmann::json& j, const std::string& key, bool required) {
    if (!j.contains(key) || j[key].is_null()) {
        if (required) bad(key, "is required");
        return {};
    }
    if (!j[key].is_array()) bad(key, "must be a list of strings");
    std::vector<std::string> out;
    for (const auto& v : j[key]) {
        if (!v.is_string()) bad(key, "must be a list of strings");
        out.push_back(v);
    }
    return out;
}

std::filesystem::path to_path(const std::string& utf8) {
    return std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(utf8.data()), utf8.size()));
}

}  // namespace

Manifest parse_manifest(const nlohmann::json& j, const std::string& dir) {
    if (!j.is_object()) bad("(file)", "must be a JSON object");
    Manifest m;
    m.dir = dir;

    m.id = text(j, "id", true);
    if (m.id.empty() || !std::all_of(m.id.begin(), m.id.end(), [](unsigned char c) { return std::islower(c) || std::isdigit(c) || c == '_'; })) {
        bad("id", "use lower-case letters, digits and _ only");
    }

    m.extensions = list(j, "extensions", true);
    if (m.extensions.empty()) bad("extensions", "must list at least one extension");
    for (std::string& e : m.extensions) {
        if (e.size() < 2 || e[0] != '.') bad("extensions", "each must start with a dot, like \".rb\"");
        std::transform(e.begin(), e.end(), e.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    }

    m.library = text(j, "library", true);
    if (m.library.empty() || m.library.find_first_of("/\\") != std::string::npos) bad("library", "must be a file name inside the plugin folder");
    std::error_code ec;
    if (!std::filesystem::is_regular_file(to_path(core::path_join(dir, m.library)), ec)) bad("library", "file not found: " + m.library);

    m.symbol = text(j, "symbol", true);
    if (m.symbol.rfind("tree_sitter_", 0) != 0) bad("symbol", "must start with tree_sitter_");

    m.module_naming = text(j, "module_naming", true);
    if (m.module_naming != "path" && m.module_naming != "dotted" && m.module_naming != "directory") {
        bad("module_naming", "must be path, dotted or directory");
    }
    m.resolution = text(j, "resolution", true);
    if (m.resolution != "relative_path" && m.resolution != "dotted" && m.resolution != "suffix" && m.resolution != "none") {
        bad("resolution", "must be relative_path, dotted, suffix or none");
    }
    m.self_keyword = text(j, "self_keyword", false, "this");
    m.require_function = text(j, "require_function", false);
    m.decision_node_types = list(j, "decision_node_types", false);
    return m;
}

std::vector<std::string> plugin_roots() {
#ifdef _WIN32
    const char sep = ';';
    const char* home = std::getenv("USERPROFILE");
#else
    const char sep = ':';
    const char* home = std::getenv("HOME");
#endif
    std::vector<std::string> roots;
    if (const char* env = std::getenv("PV_LANG_PLUGINS_DIR"); env && *env) {
        std::string all(env);
        std::size_t start = 0;
        while (start <= all.size()) {
            const std::size_t end = all.find(sep, start);
            const std::string part = all.substr(start, end == std::string::npos ? std::string::npos : end - start);
            if (!part.empty()) roots.push_back(core::normalize_path(part));
            if (end == std::string::npos) break;
            start = end + 1;
        }
        return roots;
    }
    if (home && *home) roots.push_back(core::normalize_path(std::string(home) + "/.project-visualizer/languages"));
    return roots;
}

}  // namespace pv::plugins
