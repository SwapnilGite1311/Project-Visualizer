#include "pv/lang_javascript/resolve.hpp"

#include "pv/core/ids.hpp"
#include "pv/core/paths.hpp"
#include "pv/lang_generic/path_modules.hpp"

namespace pv::lang_javascript {
namespace {

bool starts_with(const std::string& s, const std::string& prefix) { return s.rfind(prefix, 0) == 0; }

std::string strip_known_extension(const std::string& path) {
    const std::string ext = core::path_extension(path);
    for (const std::string& known : kJsExtensions) {
        if (ext == known) return path.substr(0, path.size() - ext.size());
    }
    return path;
}

parse::ImportTarget target_for(const parse::RawImport& imp, const std::string& file, const parse::ProjectIndex& index) {
    if (!imp.name.empty() && imp.name != "default" && imp.name != "*") {
        if (const auto symbol = index.symbol_id(file, imp.name)) return {*symbol, ""};
    }
    return {core::make_node_id(core::NodeKind::Module, file, ""), ""};
}

}  // namespace

parse::ImportTarget resolve_js_import(const parse::RawImport& imp, const std::string& importer_file, const parse::ProjectIndex& index) {
    const std::string& spec = imp.module;
    std::vector<std::string> candidates;
    if (starts_with(spec, "./") || starts_with(spec, "../") || spec == "." || spec == "..") {
        candidates.push_back(lang_generic::resolve_relative_path(importer_file, spec, kJsExtensions));
    } else if (starts_with(spec, "@/") || starts_with(spec, "~/")) {
        const std::string rest = strip_known_extension(spec.substr(2));
        candidates.push_back(core::normalize_path("src/" + rest));
        candidates.push_back(core::normalize_path(rest));
    } else if (starts_with(spec, "/")) {
        return {};
    } else {
        return {"", lang_generic::external_package_name(spec)};
    }
    for (const std::string& base : candidates) {
        if (const auto file = index.file_for_module(base)) return target_for(imp, *file, index);
    }
    return {};
}

}  // namespace pv::lang_javascript
