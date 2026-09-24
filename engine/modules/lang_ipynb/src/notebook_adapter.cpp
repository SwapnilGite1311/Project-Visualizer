#include "pv/lang_ipynb/notebook_adapter.hpp"

#include "pv/lang_ipynb/notebook.hpp"
#include "pv/lang_python/internal.hpp"

namespace pv::lang_ipynb {

std::string NotebookAdapter::id() const {
    return "python_notebook";
}

std::vector<std::string> NotebookAdapter::extensions() const {
    return {".ipynb"};
}

parse::FileExtraction NotebookAdapter::extract(const std::string& rel_path, const std::string& source) const {
    // Language "python": the builder then uses the Python adapter for module names and resolution.
    return lang_python::extract_python(rel_path, notebook_to_source(source), "python");
}

std::vector<std::string> NotebookAdapter::module_names(const std::string& rel_path) const {
    return lang_python::module_names_for(rel_path);
}

parse::ImportTarget NotebookAdapter::resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                                    const parse::ProjectIndex& index) const {
    return lang_python::resolve_python_import(imp, importer_file, index);
}

std::string NotebookAdapter::self_keyword() const {
    return "self";
}

}  // namespace pv::lang_ipynb
