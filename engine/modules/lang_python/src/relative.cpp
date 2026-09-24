#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"
#include "pv/lang_python/internal.hpp"

namespace pv::lang_python {

std::string resolve_relative_module(const std::string& importer_file, const std::string& module_text) {
    std::size_t dots = 0;
    while (dots < module_text.size() && module_text[dots] == '.') ++dots;
    const std::string rest = module_text.substr(dots);

    const std::vector<std::string> names = module_names_for(importer_file);
    const std::string base = names.empty() ? "" : names[0];
    std::string package;
    if (core::path_stem(importer_file) == "__init__") {
        package = base;
    } else {
        const std::size_t last_dot = base.rfind('.');
        package = last_dot == std::string::npos ? "" : base.substr(0, last_dot);
    }

    std::vector<std::string> parts = package.empty() ? std::vector<std::string>{} : core::split(package, '.');
    const std::size_t ups = dots > 0 ? dots - 1 : 0;
    if (ups > 0 && ups >= parts.size()) return "";
    parts.resize(parts.size() - ups);
    if (!rest.empty()) parts.push_back(rest);
    return core::join(parts, ".");
}

}  // namespace pv::lang_python
