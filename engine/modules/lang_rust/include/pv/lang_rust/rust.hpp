#pragma once
#include <string>
#include <vector>

#include <tree_sitter/api.h>

#include "pv/lang_generic/query_extractor.hpp"
#include "pv/parse/adapter.hpp"

extern "C" const TSLanguage* tree_sitter_rust(void);

namespace pv::lang_rust {

extern const char* kRustDefinitions;
extern const char* kRustImports;
extern const char* kRustCalls;
extern const char* kRustImpls;  // @impl.type/@impl.fn (methods of a type) and @impl.trait/@impl.for (trait implementations)

// Rust module paths: "src/main.rs"/"src/lib.rs" -> {"crate"}; "src/a/mod.rs" -> {"crate::a"}; "src/a/b.rs" -> {"crate::a::b"};
// files outside src/ -> path without extension with "::" ("tests/it.rs" -> {"tests::it"}).
std::vector<std::string> rust_module_names(const std::string& rel_path);

// `mod x;`, `use crate::a::B`, `use self::…`, `use super::…`, `use std::…` (external "std").
parse::ImportTarget resolve_rust_import(const parse::RawImport& imp, const std::string& importer_file, const parse::ProjectIndex& index);

class RustAdapter : public parse::LanguageAdapter {
public:
    RustAdapter();
    std::string id() const override { return "rust"; }
    std::vector<std::string> extensions() const override { return {".rs"}; }
    parse::FileExtraction extract(const std::string& rel_path, const std::string& source) const override;
    std::vector<std::string> module_names(const std::string& rel_path) const override { return rust_module_names(rel_path); }
    parse::ImportTarget resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                       const parse::ProjectIndex& index) const override {
        return resolve_rust_import(imp, importer_file, index);
    }
    std::string self_keyword() const override { return "self"; }

private:
    lang_generic::QuerySpec spec_;
};

}  // namespace pv::lang_rust
