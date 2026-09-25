#include <optional>

#include "pv/core/ids.hpp"
#include "pv/core/paths.hpp"
#include "pv/lang_rust/rust.hpp"

namespace pv::lang_rust {
namespace {

bool starts_with(const std::string& s, const std::string& prefix) { return s.rfind(prefix, 0) == 0; }

std::string replace_all(std::string text, const std::string& from, const std::string& to) {
    for (std::size_t pos = 0; (pos = text.find(from, pos)) != std::string::npos; pos += to.size()) text.replace(pos, from.size(), to);
    return text;
}

// "crate::a::b" -> "crate::a"; "crate" -> "crate"
std::string parent_of(const std::string& module) {
    const std::size_t sep = module.rfind("::");
    return sep == std::string::npos ? module : module.substr(0, sep);
}

std::string join(const std::string& a, const std::string& b) { return b.empty() ? a : a + "::" + b; }

parse::ImportTarget module_target(const std::string& file) { return {core::make_node_id(core::NodeKind::Module, file, ""), ""}; }

// The module itself, or (last segment as a symbol) a definition inside its parent module.
std::optional<parse::ImportTarget> find(const std::string& path, const parse::ProjectIndex& index) {
    if (const auto file = index.file_for_module(path)) return module_target(*file);
    const std::size_t sep = path.rfind("::");
    if (sep == std::string::npos) return std::nullopt;
    if (const auto file = index.file_for_module(path.substr(0, sep))) {
        if (const auto symbol = index.symbol_id(*file, path.substr(sep + 2))) return parse::ImportTarget{*symbol, ""};
        return module_target(*file);
    }
    return std::nullopt;
}

}  // namespace

std::vector<std::string> rust_module_names(const std::string& rel_path) {
    const std::string path = core::normalize_path(rel_path);
    const std::string ext = core::path_extension(path);
    const std::string stem_path = ext.empty() ? path : path.substr(0, path.size() - ext.size());
    if (!starts_with(stem_path, "src/")) return {replace_all(stem_path, "/", "::")};
    std::string inner = stem_path.substr(4);
    if (inner == "main" || inner == "lib") return {"crate"};
    if (inner == "mod") return {"crate"};
    if (inner.size() > 4 && inner.compare(inner.size() - 4, 4, "/mod") == 0) inner = inner.substr(0, inner.size() - 4);
    return {"crate::" + replace_all(inner, "/", "::")};
}

parse::ImportTarget resolve_rust_import(const parse::RawImport& imp, const std::string& importer_file, const parse::ProjectIndex& index) {
    const std::vector<std::string> names = rust_module_names(importer_file);
    const std::string importer = names.empty() ? "crate" : names.front();
    // `use a::b::C` arrives as module "a::b" + name "C"; `use a::b` (a module) as module "a" + name "b".
    const std::string full = imp.name.empty() || imp.name == "*" ? imp.module : imp.module + "::" + imp.name;
    if (full.empty()) return {};

    std::vector<std::string> candidates;
    if (full.find("::") == std::string::npos) {
        candidates.push_back(join(importer, full));  // `mod x;` declared in this file
        candidates.push_back(join("crate", full));
    } else if (starts_with(full, "crate::")) {
        candidates.push_back(full);
    } else if (starts_with(full, "self::")) {
        candidates.push_back(join(importer, full.substr(6)));
    } else if (starts_with(full, "super::")) {
        std::string rest = full;
        std::string base = importer;
        while (starts_with(rest, "super::")) {
            rest = rest.substr(7);
            base = parent_of(base);
        }
        candidates.push_back(join(base, rest));
    } else {
        candidates.push_back(join("crate", full));  // a path relative to the crate root (2015 edition style)
    }
    for (const std::string& c : candidates) {
        if (auto target = find(c, index)) return *target;
    }
    if (starts_with(full, "crate::") || starts_with(full, "self::") || starts_with(full, "super::")) return {};
    return {"", full.substr(0, full.find("::"))};  // std, serde, tokio…
}

}  // namespace pv::lang_rust
