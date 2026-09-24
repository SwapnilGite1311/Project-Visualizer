#pragma once
#include "pv/parse/adapter.hpp"

namespace pv::lang_ipynb {

class NotebookAdapter : public parse::LanguageAdapter {
public:
    std::string id() const override;                        // "python_notebook"
    std::vector<std::string> extensions() const override;   // {".ipynb"}
    parse::FileExtraction extract(const std::string& rel_path, const std::string& source) const override;
    std::vector<std::string> module_names(const std::string& rel_path) const override;
    parse::ImportTarget resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                       const parse::ProjectIndex& index) const override;
    std::string self_keyword() const override;              // "self"
};

}  // namespace pv::lang_ipynb
