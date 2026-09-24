#include <optional>

#include "pv/core/ids.hpp"
#include "pv/lang_python/internal.hpp"

namespace pv::lang_python {

namespace {

std::optional<std::string> module_node(const parse::ProjectIndex& index, const std::string& name) {
    const auto file = index.file_for_module(name);
    if (!file) return std::nullopt;
    return core::make_node_id(core::NodeKind::Module, *file, "");
}

parse::ImportTarget fallback(const parse::RawImport& imp, const std::string& first, const parse::ProjectIndex& index) {
    if ((!imp.module.empty() && imp.module[0] == '.') || index.has_top_level(first)) return {};
    return parse::ImportTarget{"", first};
}

}  // namespace

parse::ImportTarget resolve_python_import(const parse::RawImport& imp, const std::string& importer_file,
                                          const parse::ProjectIndex& index) {
    std::string base;
    if (!imp.module.empty() && imp.module[0] == '.') {
        base = resolve_relative_module(importer_file, imp.module);
        if (base.empty()) return {};
    } else {
        base = imp.module;
    }
    const std::string first = base.substr(0, base.find('.'));

    if (!imp.name.empty() && imp.name != "*") {
        const std::string sub = base.empty() ? imp.name : base + "." + imp.name;
        if (const auto id = module_node(index, sub)) return parse::ImportTarget{*id, ""};
        if (const auto file = index.file_for_module(base)) {
            if (const auto symbol = index.symbol_id(*file, imp.name)) return parse::ImportTarget{*symbol, ""};
            return parse::ImportTarget{*module_node(index, base), ""};
        }
        return fallback(imp, first, index);
    }

    std::string candidate = base;
    while (!candidate.empty()) {
        if (const auto id = module_node(index, candidate)) return parse::ImportTarget{*id, ""};
        const std::size_t dot = candidate.rfind('.');
        if (dot == std::string::npos) break;
        candidate = candidate.substr(0, dot);
    }
    return fallback(imp, first, index);
}

}  // namespace pv::lang_python
