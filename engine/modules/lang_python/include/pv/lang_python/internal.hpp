#pragma once
#include <string>
#include <vector>
#include <tree_sitter/api.h>
#include "pv/parse/adapter.hpp"

extern "C" const TSLanguage* tree_sitter_python(void);

namespace pv::lang_python {
std::vector<std::string> module_names_for(const std::string& rel_path);
std::string resolve_relative_module(const std::string& importer_file, const std::string& module_text);
std::string first_line(const std::string& text, std::size_t max_len);
std::string strip_string_literal(const std::string& literal);
std::string extract_docstring(TSNode block_or_module, const std::string& source);
int compute_complexity(TSNode definition);
bool has_main_guard(TSNode module_root, const std::string& source);
parse::FileExtraction extract_python(const std::string& rel_path, const std::string& source, const std::string& language_id);
parse::ImportTarget resolve_python_import(const parse::RawImport& imp, const std::string& importer_file,
                                          const parse::ProjectIndex& index);
}  // namespace pv::lang_python
