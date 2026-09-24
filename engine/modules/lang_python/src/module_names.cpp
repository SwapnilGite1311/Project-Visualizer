#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"
#include "pv/lang_python/internal.hpp"

namespace pv::lang_python {

std::vector<std::string> module_names_for(const std::string& rel_path) {
    const std::string dir = core::path_parent(rel_path);
    const std::string stem = core::path_stem(rel_path);
    std::vector<std::string> parts = dir.empty() ? std::vector<std::string>{} : core::split(dir, '/');
    if (stem != "__init__") parts.push_back(stem);
    if (parts.empty()) return {};
    const std::string full = core::join(parts, ".");
    if (parts.size() > 1 && (parts[0] == "src" || parts[0] == "lib")) {
        const std::vector<std::string> rest(parts.begin() + 1, parts.end());
        return {core::join(rest, "."), full};
    }
    return {full};
}

}  // namespace pv::lang_python
