#include <set>

#include "pv/core/ids.hpp"
#include "pv/core/paths.hpp"
#include "pv/lang_cpp/cpp.hpp"
#include "pv/lang_generic/path_modules.hpp"

namespace pv::lang_cpp {
namespace {

const std::set<std::string> kSystemHeaders = {
    "stdio.h",  "stdlib.h", "string.h", "math.h",   "vector",        "string",        "map",    "set",   "memory",
    "iostream", "algorithm", "utility", "cstdio",   "cstdlib",       "cstring",       "functional", "unordered_map",
    "unordered_set", "thread", "mutex", "chrono"};

std::string without_extension(const std::string& spec) {
    const std::string ext = core::path_extension(spec);
    return ext.empty() ? spec : spec.substr(0, spec.size() - ext.size());
}

parse::ImportTarget module_target(const std::string& file) { return {core::make_node_id(core::NodeKind::Module, file, ""), ""}; }

// A project file whose path ends with the include ("inc/a.h" -> "lib/inc/a.h", as with -I include folders);
// the shortest such path wins (then alphabetical), so the result does not depend on hash order.
std::string file_ending_with(const parse::ProjectIndex& index, const std::string& spec) {
    std::string best;
    for (const auto& [module, file] : index.module_to_file) {
        const bool match = module == spec || (module.size() > spec.size() && module.compare(module.size() - spec.size(), spec.size(), spec) == 0 &&
                                              module[module.size() - spec.size() - 1] == '/');
        if (match && (best.empty() || module.size() < best.size() || (module.size() == best.size() && module < best))) best = module;
    }
    return best;
}

}  // namespace

std::vector<std::string> c_module_names(const std::string& rel_path) { return {core::normalize_path(rel_path)}; }

parse::ImportTarget resolve_include(const parse::RawImport& imp, const std::string& importer_file, const parse::ProjectIndex& index) {
    const std::string& spec = imp.module;  // quotes or <> already removed
    if (spec.empty()) return {};
    const std::string candidate = core::normalize_path(core::path_join(core::path_parent(importer_file), spec));
    if (const auto file = index.file_for_module(candidate)) return module_target(*file);
    const std::string normalized = core::normalize_path(spec);
    for (const std::string& by_suffix : {file_ending_with(index, normalized), lang_generic::longest_suffix_module(index, normalized)}) {
        if (by_suffix.empty()) continue;
        if (const auto file = index.file_for_module(by_suffix)) return module_target(*file);
    }
    if (spec.find('/') == std::string::npos && kSystemHeaders.count(spec)) return {"", without_extension(spec)};
    return {};
}

}  // namespace pv::lang_cpp
