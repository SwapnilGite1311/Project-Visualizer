#pragma once
#include <string>
#include <vector>
#include "pv/parse/project_index.hpp"
#include "pv/parse/raw.hpp"

namespace pv::parse {

struct ImportTarget {
    std::string node_id;        // resolved project node (module, class, function…) or ""
    std::string external_name;  // top-level external package name (e.g. "numpy") or ""
};                              // both empty = could not resolve

class LanguageAdapter {
public:
    virtual ~LanguageAdapter() = default;
    virtual std::string id() const = 0;                         // "python"
    virtual std::vector<std::string> extensions() const = 0;    // lower-case, e.g. {".py", ".pyi"}
    virtual FileExtraction extract(const std::string& rel_path, const std::string& source) const = 0;
    virtual std::vector<std::string> module_names(const std::string& rel_path) const = 0; // preferred name first
    virtual ImportTarget resolve_import(const RawImport& imp, const std::string& importer_file,
                                        const ProjectIndex& index) const = 0;
    virtual std::string self_keyword() const = 0;               // "self" for Python, "this" for JS/Java
};

}  // namespace pv::parse
