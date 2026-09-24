#pragma once
#include <string>
#include <vector>

#include <tree_sitter/api.h>

#include "pv/core/types.hpp"

namespace pv::parse {

class TsTree {
public:
    explicit TsTree(TSTree* tree);
    ~TsTree();
    TsTree(TsTree&& other) noexcept;
    TsTree& operator=(TsTree&& other) noexcept;
    TsTree(const TsTree&) = delete;
    TsTree& operator=(const TsTree&) = delete;
    TSNode root() const;
    bool has_error() const;   // ts_node_has_error(root)
private:
    TSTree* tree_ = nullptr;
};

class TsParser {
public:
    explicit TsParser(const TSLanguage* language);   // throws PvError(err::Internal) if set_language fails
    ~TsParser();
    TsParser(const TsParser&) = delete;
    TsParser& operator=(const TsParser&) = delete;
    TsTree parse(const std::string& source) const;   // ts_parser_parse_string
private:
    TSParser* parser_ = nullptr;
};

std::string node_text(TSNode node, const std::string& source);   // bytes [start_byte, end_byte)
core::Span node_span(TSNode node);                                // lines +1 (1-based), columns as-is
std::string node_type(TSNode node);                               // ts_node_type
TSNode child_by_field(TSNode node, const char* field);           // ts_node_child_by_field_name(node, field, strlen(field))
std::vector<TSNode> named_children(TSNode node);
std::vector<TSNode> all_children(TSNode node);

}  // namespace pv::parse
