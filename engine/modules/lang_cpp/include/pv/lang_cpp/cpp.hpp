#pragma once
#include <memory>
#include <string>
#include <vector>

#include <tree_sitter/api.h>

#include "pv/lang_generic/query_extractor.hpp"
#include "pv/parse/adapter.hpp"

extern "C" const TSLanguage* tree_sitter_c(void);
extern "C" const TSLanguage* tree_sitter_cpp(void);

namespace pv::lang_cpp {

extern const char* kCDefinitions;
extern const char* kCppDefinitions;
extern const char* kIncludes;  // C and C++
extern const char* kCCalls;
extern const char* kCppCalls;
extern const char* kCppInherits;

// C and C++ files are included by path, extension and all: "src/util.h" -> {"src/util.h"}.
std::vector<std::string> c_module_names(const std::string& rel_path);

// "util.h" (next to the includer, else by path suffix) -> the module; <iostream>, <stdio.h> -> external; unknown -> {}.
parse::ImportTarget resolve_include(const parse::RawImport& imp, const std::string& importer_file, const parse::ProjectIndex& index);

// `int Square::area()` defined outside its class: name "Square::area" becomes qualname "Square.area" (a method of Square
// when the class is in the same file) and the calls inside it follow.
void attach_qualified_definitions(parse::FileExtraction& fx);

// C and C++ share one implementation; only the grammar, the queries and the extensions differ.
class CFamilyAdapter : public parse::LanguageAdapter {
public:
    CFamilyAdapter(std::string id, std::vector<std::string> extensions, lang_generic::QuerySpec spec);
    std::string id() const override { return id_; }
    std::vector<std::string> extensions() const override { return extensions_; }
    parse::FileExtraction extract(const std::string& rel_path, const std::string& source) const override;
    std::vector<std::string> module_names(const std::string& rel_path) const override { return c_module_names(rel_path); }
    parse::ImportTarget resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                       const parse::ProjectIndex& index) const override {
        return resolve_include(imp, importer_file, index);
    }
    std::string self_keyword() const override { return "this"; }

private:
    std::string id_;
    std::vector<std::string> extensions_;
    lang_generic::QuerySpec spec_;
};

std::unique_ptr<parse::LanguageAdapter> make_c_adapter();
std::unique_ptr<parse::LanguageAdapter> make_cpp_adapter();

}  // namespace pv::lang_cpp
