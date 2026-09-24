#include "pv/parse/ts.hpp"

#include <algorithm>
#include <cstring>

#include "pv/core/error.hpp"

namespace pv::parse {

TsTree::TsTree(TSTree* tree) : tree_(tree) {}

TsTree::~TsTree() {
    if (tree_) ts_tree_delete(tree_);
}

TsTree::TsTree(TsTree&& other) noexcept : tree_(other.tree_) {
    other.tree_ = nullptr;
}

TsTree& TsTree::operator=(TsTree&& other) noexcept {
    if (this != &other) {
        if (tree_) ts_tree_delete(tree_);
        tree_ = other.tree_;
        other.tree_ = nullptr;
    }
    return *this;
}

TSNode TsTree::root() const {
    return ts_tree_root_node(tree_);
}

bool TsTree::has_error() const {
    return ts_node_has_error(root());
}

TsParser::TsParser(const TSLanguage* language) : parser_(ts_parser_new()) {
    if (!ts_parser_set_language(parser_, language)) {
        ts_parser_delete(parser_);
        parser_ = nullptr;
        throw core::PvError(core::err::Internal, "tree-sitter language version mismatch");
    }
}

TsParser::~TsParser() {
    if (parser_) ts_parser_delete(parser_);
}

TsTree TsParser::parse(const std::string& source) const {
    TSTree* tree = ts_parser_parse_string(parser_, nullptr, source.c_str(), static_cast<uint32_t>(source.size()));
    if (!tree) throw core::PvError(core::err::Internal, "tree-sitter parse failed");
    return TsTree(tree);
}

std::string node_text(TSNode node, const std::string& source) {
    const uint32_t start = ts_node_start_byte(node);
    const uint32_t end = ts_node_end_byte(node);
    if (start >= source.size() || end <= start) return "";
    return source.substr(start, std::min<size_t>(end, source.size()) - start);
}

core::Span node_span(TSNode node) {
    const TSPoint start = ts_node_start_point(node);
    const TSPoint end = ts_node_end_point(node);
    return core::Span{static_cast<int>(start.row) + 1, static_cast<int>(start.column), static_cast<int>(end.row) + 1,
                      static_cast<int>(end.column)};
}

std::string node_type(TSNode node) {
    return ts_node_type(node);
}

TSNode child_by_field(TSNode node, const char* field) {
    return ts_node_child_by_field_name(node, field, static_cast<uint32_t>(std::strlen(field)));
}

std::vector<TSNode> named_children(TSNode node) {
    std::vector<TSNode> out;
    const uint32_t count = ts_node_named_child_count(node);
    out.reserve(count);
    for (uint32_t i = 0; i < count; ++i) out.push_back(ts_node_named_child(node, i));
    return out;
}

std::vector<TSNode> all_children(TSNode node) {
    std::vector<TSNode> out;
    const uint32_t count = ts_node_child_count(node);
    out.reserve(count);
    for (uint32_t i = 0; i < count; ++i) out.push_back(ts_node_child(node, i));
    return out;
}

}  // namespace pv::parse
