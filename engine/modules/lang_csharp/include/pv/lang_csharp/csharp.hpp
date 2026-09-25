#pragma once
#include <string>
#include <vector>

#include <tree_sitter/api.h>

#include "pv/lang_generic/query_extractor.hpp"
#include "pv/parse/adapter.hpp"

extern "C" const TSLanguage* tree_sitter_c_sharp(void);

namespace pv::lang_csharp {

extern const char* kCsDefinitions;
extern const char* kCsImports;
extern const char* kCsCalls;
extern const char* kCsInherits;

// C# code is imported by namespace, and namespaces follow folders: a file is known by its folder ("src/Util/Helper.cs" -> {"src/Util"}).
std::vector<std::string> csharp_module_names(const std::string& rel_path);

// `using Acme.Util;` -> the folder whose path ends with the most namespace parts ("src/Util"); none -> external "Acme".
parse::ImportTarget resolve_csharp_import(const parse::RawImport& imp, const std::string& importer_file, const parse::ProjectIndex& index);

class CSharpAdapter : public parse::LanguageAdapter {
public:
    CSharpAdapter();
    std::string id() const override { return "csharp"; }
    std::vector<std::string> extensions() const override { return {".cs"}; }
    parse::FileExtraction extract(const std::string& rel_path, const std::string& source) const override {
        return lang_generic::extract_with_queries(spec_, rel_path, source);
    }
    std::vector<std::string> module_names(const std::string& rel_path) const override { return csharp_module_names(rel_path); }
    parse::ImportTarget resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                       const parse::ProjectIndex& index) const override {
        return resolve_csharp_import(imp, importer_file, index);
    }
    std::string self_keyword() const override { return "this"; }

private:
    lang_generic::QuerySpec spec_;
};

}  // namespace pv::lang_csharp
