#pragma once
#include <string>
#include <vector>

#include <tree_sitter/api.h>

#include "pv/parse/raw.hpp"

namespace pv::lang_generic {

// Four tree-sitter queries using the standard capture names (see README.md) describe a whole language.
struct QuerySpec {
    std::string language_id;
    const TSLanguage* language = nullptr;
    std::string definitions_query;
    std::string imports_query;     // may be empty
    std::string calls_query;       // may be empty
    std::string inherits_query;    // may be empty
    std::vector<std::string> decision_node_types;   // for complexity
    std::string require_function;  // e.g. "require"; empty = no require filtering
};

parse::FileExtraction extract_with_queries(const QuerySpec& spec, const std::string& rel_path, const std::string& source);

std::string strip_quotes(const std::string& text);  // removes surrounding "", '', ``, or <>

}  // namespace pv::lang_generic
