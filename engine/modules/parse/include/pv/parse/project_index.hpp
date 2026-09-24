#pragma once
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace pv::parse {

struct ProjectIndex {
    std::unordered_map<std::string, std::string> module_to_file;                 // "app.utils" -> "app/utils.py"
    std::unordered_map<std::string, std::vector<std::string>> file_to_modules;   // file -> its module names
    std::unordered_map<std::string, std::unordered_map<std::string, std::string>> file_symbols; // file -> (qualname -> node id)
    std::unordered_set<std::string> top_levels;                                  // first segments of module names

    void add_module_name(const std::string& module_name, const std::string& file_path);
    void add_symbol(const std::string& file_path, const std::string& qualname, const std::string& node_id);
    std::optional<std::string> file_for_module(const std::string& module_name) const;
    std::optional<std::string> symbol_id(const std::string& file_path, const std::string& qualname) const;
    bool has_top_level(const std::string& segment) const;
};

}  // namespace pv::parse
