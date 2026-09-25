#include "pv/core/paths.hpp"
#include "pv/lang_csharp/csharp.hpp"

namespace pv::lang_csharp {
namespace {

std::vector<std::string> split(const std::string& text, char sep) {
    std::vector<std::string> parts;
    std::size_t start = 0;
    while (start <= text.size()) {
        const std::size_t end = text.find(sep, start);
        const std::string part = text.substr(start, end == std::string::npos ? std::string::npos : end - start);
        if (!part.empty()) parts.push_back(part);
        if (end == std::string::npos) break;
        start = end + 1;
    }
    return parts;
}

// How many trailing parts are equal: "Acme.App.Models" vs "src/App/Models" -> 2.
int trailing_match(const std::vector<std::string>& ns, const std::vector<std::string>& folder) {
    int score = 0;
    for (auto a = ns.rbegin(), b = folder.rbegin(); a != ns.rend() && b != folder.rend() && *a == *b; ++a, ++b) ++score;
    return score;
}

}  // namespace

std::vector<std::string> csharp_module_names(const std::string& rel_path) {
    const std::string folder = core::path_parent(core::normalize_path(rel_path));
    if (folder.empty()) return {};
    return {folder};
}

parse::ImportTarget resolve_csharp_import(const parse::RawImport& imp, const std::string&, const parse::ProjectIndex& index) {
    const std::vector<std::string> ns = split(imp.module, '.');
    if (ns.empty()) return {};
    std::string best;
    int best_score = 0;
    for (const auto& [module, file] : index.module_to_file) {
        const int score = trailing_match(ns, split(module, '/'));
        if (score == 0) continue;
        if (score > best_score || (score == best_score && (module.size() < best.size() || (module.size() == best.size() && module < best)))) {
            best = module;
            best_score = score;
        }
    }
    if (!best.empty()) return {"package:" + best, ""};
    return {"", ns.front()};
}

}  // namespace pv::lang_csharp
