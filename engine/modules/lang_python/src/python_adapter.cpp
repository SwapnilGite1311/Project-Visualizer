#include "pv/lang_python/python_adapter.hpp"

#include "pv/lang_python/internal.hpp"

namespace pv::lang_python {

std::string PythonAdapter::id() const {
    return "python";
}

std::vector<std::string> PythonAdapter::extensions() const {
    return {".py", ".pyi"};
}

parse::FileExtraction PythonAdapter::extract(const std::string& rel_path, const std::string& source) const {
    return extract_python(rel_path, source, id());
}

std::vector<std::string> PythonAdapter::module_names(const std::string& rel_path) const {
    return module_names_for(rel_path);
}

parse::ImportTarget PythonAdapter::resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                                  const parse::ProjectIndex& index) const {
    return resolve_python_import(imp, importer_file, index);
}

std::string PythonAdapter::self_keyword() const {
    return "self";
}

}  // namespace pv::lang_python
