#include "pv/core/paths.hpp"
#include "pv/lang_generic/path_modules.hpp"
#include "pv/lang_go/go.hpp"

namespace pv::lang_go {
namespace {

std::vector<std::string> split(const std::string& path) {
    std::vector<std::string> parts;
    std::size_t start = 0;
    while (start <= path.size()) {
        const std::size_t slash = path.find('/', start);
        parts.push_back(path.substr(start, slash == std::string::npos ? std::string::npos : slash - start));
        if (slash == std::string::npos) break;
        start = slash + 1;
    }
    return parts;
}

}  // namespace

std::vector<std::string> go_module_names(const std::string& rel_path) {
    const std::string dir = core::path_parent(core::normalize_path(rel_path));
    if (dir.empty()) return {};
    return {dir};
}

parse::ImportTarget resolve_go_import(const parse::RawImport& imp, const std::string&, const parse::ProjectIndex& index) {
    const std::string& path = imp.module;
    const std::vector<std::string> parts = split(path);
    if (parts.front().find('.') == std::string::npos) return {"", parts.front()};  // standard library: fmt, net/http
    const std::string module = lang_generic::longest_suffix_module(index, path);
    if (!module.empty()) return {"package:" + module, ""};
    const std::string& host = parts.front();
    if ((host == "github.com" || host == "gitlab.com" || host == "bitbucket.org") && parts.size() >= 3) {
        return {"", parts[0] + "/" + parts[1] + "/" + parts[2]};
    }
    return {"", host};
}

}  // namespace pv::lang_go
