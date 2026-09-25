#pragma once
#include <memory>
#include <string>
#include <vector>

#include "pv/lang_generic/query_extractor.hpp"
#include "pv/parse/adapter.hpp"

namespace pv::lang_javascript {

// JavaScript, TypeScript and TSX share one implementation; only the grammar and queries differ.
class JsFamilyAdapter : public parse::LanguageAdapter {
public:
    JsFamilyAdapter(std::string id, std::vector<std::string> extensions, lang_generic::QuerySpec spec);
    std::string id() const override;
    std::vector<std::string> extensions() const override;
    parse::FileExtraction extract(const std::string& rel_path, const std::string& source) const override;
    std::vector<std::string> module_names(const std::string& rel_path) const override;
    parse::ImportTarget resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                       const parse::ProjectIndex& index) const override;
    std::string self_keyword() const override;

private:
    std::string id_;
    std::vector<std::string> extensions_;
    lang_generic::QuerySpec spec_;
};

std::unique_ptr<parse::LanguageAdapter> make_javascript_adapter();
std::unique_ptr<parse::LanguageAdapter> make_typescript_adapter();
std::unique_ptr<parse::LanguageAdapter> make_tsx_adapter();

}  // namespace pv::lang_javascript
