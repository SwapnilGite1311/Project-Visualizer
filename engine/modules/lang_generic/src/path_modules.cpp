#include "pv/lang_generic/path_modules.hpp"

#include <algorithm>

#include "pv/core/paths.hpp"

namespace pv::lang_generic {

namespace {

std::string without_extension(const std::string& path) {
    const std::string ext = core::path_extension(path);
    return ext.empty() ? path : path.substr(0, path.size() - ext.size());
}

}  // namespace

std::vector<std::string> path_module_names(const std::string& rel_path) {
    const std::string base = without_extension(core::normalize_path(rel_path));
    std::vector<std::string> names{base};
    if (core::path_file_name(base) == "index") {
        const std::string dir = core::path_parent(base);
        if (!dir.empty()) names.push_back(dir);
    }
    return names;
}

std::string resolve_relative_path(const std::string& importer_file, const std::string& spec,
                                  const std::vector<std::string>& strip_extensions) {
    std::string base = core::normalize_path(core::path_join(core::path_parent(importer_file), spec));
    const std::string ext = core::path_extension(base);
    if (!ext.empty() && std::find(strip_extensions.begin(), strip_extensions.end(), ext) != strip_extensions.end()) {
        base = base.substr(0, base.size() - ext.size());
    }
    return base;
}

std::string longest_suffix_module(const parse::ProjectIndex& index, const std::string& import_path) {
    std::string best;
    for (const auto& [module, file] : index.module_to_file) {
        const bool match = import_path == module ||
                           (import_path.size() > module.size() &&
                            import_path.compare(import_path.size() - module.size() - 1, std::string::npos, "/" + module) == 0);
        if (match && (module.size() > best.size() || (module.size() == best.size() && module < best))) best = module;
    }
    return best;
}

std::string external_package_name(const std::string& spec) {
    if (spec.find(':') != std::string::npos) return spec;
    const std::size_t first = spec.find('/');
    if (first == std::string::npos) return spec;
    if (spec[0] == '@') {
        const std::size_t second = spec.find('/', first + 1);
        return second == std::string::npos ? spec : spec.substr(0, second);
    }
    return spec.substr(0, first);
}

}  // namespace pv::lang_generic
