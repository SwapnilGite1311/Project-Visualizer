#pragma once
#include <string>
#include <vector>

#include <tree_sitter/api.h>

#include "pv/lang_generic/query_extractor.hpp"
#include "pv/parse/adapter.hpp"

extern "C" const TSLanguage* tree_sitter_java(void);

namespace pv::lang_java {

extern const char* kJavaDefinitions;
extern const char* kJavaImports;
extern const char* kJavaCalls;
extern const char* kJavaInherits;

// "src/main/java/com/acme/App.java" -> {"com.acme.App"}
std::vector<std::string> java_module_names(const std::string& rel_path);

parse::ImportTarget resolve_java_import(const parse::RawImport& imp, const std::string& importer_file,
                                       const parse::ProjectIndex& index);

class JavaAdapter : public parse::LanguageAdapter {
public:
    JavaAdapter();
    std::string id() const override { return "java"; }
    std::vector<std::string> extensions() const override { return {".java"}; }
    parse::FileExtraction extract(const std::string& rel_path, const std::string& source) const override;
    std::vector<std::string> module_names(const std::string& rel_path) const override { return java_module_names(rel_path); }
    parse::ImportTarget resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                       const parse::ProjectIndex& index) const override {
        return resolve_java_import(imp, importer_file, index);
    }
    std::string self_keyword() const override { return "this"; }

private:
    lang_generic::QuerySpec spec_;
};

}  // namespace pv::lang_java
