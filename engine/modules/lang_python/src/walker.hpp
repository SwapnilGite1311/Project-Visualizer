#pragma once
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>
#include <tree_sitter/api.h>
#include "pv/parse/raw.hpp"

namespace pv::lang_python {
class PythonWalker {
public:
    PythonWalker(const std::string& source, parse::FileExtraction& out);
    void walk(TSNode root);
private:
    void visit(TSNode node);
    void on_definition(TSNode node, bool is_class);
    void on_import(TSNode node);
    void on_import_from(TSNode node);
    void on_call(TSNode node);
    void on_bases(TSNode class_node, const std::string& class_qualname);
    std::string current_qualname() const;
    bool current_is_class() const;
    std::string unique_qualname(const std::string& base);
    const std::string& source_;
    parse::FileExtraction& out_;
    std::vector<std::pair<std::string, bool>> scope_;  // (qualname, is_class), innermost last
    std::unordered_map<std::string, int> seen_;
};
}  // namespace pv::lang_python
