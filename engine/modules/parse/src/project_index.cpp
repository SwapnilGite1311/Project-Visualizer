#include "pv/parse/project_index.hpp"

#include <algorithm>

namespace pv::parse {

void ProjectIndex::add_module_name(const std::string& module_name, const std::string& file_path) {
    if (module_name.empty()) return;
    module_to_file.emplace(module_name, file_path);
    std::vector<std::string>& names = file_to_modules[file_path];
    if (std::find(names.begin(), names.end(), module_name) == names.end()) names.push_back(module_name);
    top_levels.insert(module_name.substr(0, module_name.find('.')));
}

void ProjectIndex::add_symbol(const std::string& file_path, const std::string& qualname, const std::string& node_id) {
    file_symbols[file_path][qualname] = node_id;
}

std::optional<std::string> ProjectIndex::file_for_module(const std::string& module_name) const {
    auto it = module_to_file.find(module_name);
    if (it == module_to_file.end()) return std::nullopt;
    return it->second;
}

std::optional<std::string> ProjectIndex::symbol_id(const std::string& file_path, const std::string& qualname) const {
    auto file = file_symbols.find(file_path);
    if (file == file_symbols.end()) return std::nullopt;
    auto sym = file->second.find(qualname);
    if (sym == file->second.end()) return std::nullopt;
    return sym->second;
}

bool ProjectIndex::has_top_level(const std::string& segment) const {
    return top_levels.count(segment) > 0;
}

}  // namespace pv::parse
