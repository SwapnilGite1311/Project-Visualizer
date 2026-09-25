#include <algorithm>
#include <optional>

#include "pv/core/ids.hpp"
#include "pv/core/paths.hpp"
#include "pv/lang_java/java.hpp"

namespace pv::lang_java {
namespace {

std::string last_segment(const std::string& dotted) {
    const std::size_t dot = dotted.rfind('.');
    return dot == std::string::npos ? dotted : dotted.substr(dot + 1);
}

std::string without_last_segment(const std::string& dotted) {
    const std::size_t dot = dotted.rfind('.');
    return dot == std::string::npos ? "" : dotted.substr(0, dot);
}

// The class (or member) named by the last segment of a module name, else the module itself.
std::optional<parse::ImportTarget> lookup(const std::string& module, const parse::ProjectIndex& index) {
    const auto file = index.file_for_module(module);
    if (!file) return std::nullopt;
    if (const auto symbol = index.symbol_id(*file, last_segment(module))) return parse::ImportTarget{*symbol, ""};
    return parse::ImportTarget{core::make_node_id(core::NodeKind::Module, *file, ""), ""};
}

}  // namespace

std::vector<std::string> java_module_names(const std::string& rel_path) {
    std::string p = core::normalize_path(rel_path);
    if (core::path_extension(p) == ".java") p = p.substr(0, p.size() - 5);
    const std::size_t java_root = p.rfind("/java/");
    if (java_root != std::string::npos) {
        p = p.substr(java_root + 6);
    } else if (p.rfind("src/", 0) == 0) {
        p = p.substr(4);
    }
    std::replace(p.begin(), p.end(), '/', '.');
    return {p};
}

parse::ImportTarget resolve_java_import(const parse::RawImport& imp, const std::string&, const parse::ProjectIndex& index) {
    if (imp.name == "*") return {};
    const std::string& module = imp.module;
    if (const auto hit = lookup(module, index)) return *hit;
    const std::string outer = without_last_segment(module);  // static imports name a member of a class
    if (!outer.empty()) {
        if (const auto hit = lookup(outer, index)) return *hit;
    }
    const std::size_t first_dot = module.find('.');
    const std::string first = module.substr(0, first_dot);
    if (index.has_top_level(first)) return {};
    if ((first == "com" || first == "org" || first == "net" || first == "io") && first_dot != std::string::npos) {
        const std::size_t second_dot = module.find('.', first_dot + 1);
        return {"", module.substr(0, second_dot)};
    }
    return {"", first};
}

}  // namespace pv::lang_java
