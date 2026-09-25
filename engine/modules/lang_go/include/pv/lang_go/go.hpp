#pragma once
#include <string>
#include <vector>

#include <tree_sitter/api.h>

#include "pv/lang_generic/query_extractor.hpp"
#include "pv/parse/adapter.hpp"

extern "C" const TSLanguage* tree_sitter_go(void);

namespace pv::lang_go {

extern const char* kGoDefinitions;
extern const char* kGoImports;
extern const char* kGoCalls;
extern const char* kGoReceivers;  // captures @receiver (type name) and @name (method name)

// A Go package is a directory: "internal/store/store.go" -> {"internal/store"}; files in the root -> {}.
std::vector<std::string> go_module_names(const std::string& rel_path);

parse::ImportTarget resolve_go_import(const parse::RawImport& imp, const std::string& importer_file,
                                     const parse::ProjectIndex& index);

class GoAdapter : public parse::LanguageAdapter {
public:
    GoAdapter();
    std::string id() const override { return "go"; }
    std::vector<std::string> extensions() const override { return {".go"}; }
    parse::FileExtraction extract(const std::string& rel_path, const std::string& source) const override;
    std::vector<std::string> module_names(const std::string& rel_path) const override { return go_module_names(rel_path); }
    parse::ImportTarget resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                       const parse::ProjectIndex& index) const override {
        return resolve_go_import(imp, importer_file, index);
    }
    std::string self_keyword() const override { return ""; }

private:
    lang_generic::QuerySpec spec_;
};

}  // namespace pv::lang_go
