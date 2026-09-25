#include <algorithm>
#include <set>

#include "pv/analysis/analysis.hpp"
#include "pv/core/ids.hpp"
#include "pv/grounding/grounding.hpp"

namespace pv::grounding {
namespace {

constexpr std::size_t kMaxNamesPerPackage = 15;

std::string join(const std::vector<std::string>& items, const std::string& sep) {
    std::string out;
    for (std::size_t i = 0; i < items.size(); ++i) out += (i ? sep : "") + items[i];
    return out;
}

// Classes and module-level functions of the modules directly inside `parent`.
std::vector<std::string> definition_names(const graph::Graph& g, const std::vector<const core::Node*>& modules) {
    std::vector<std::string> names;
    for (const core::Node* m : modules) {
        for (const core::Node* d : g.children(m->id)) {
            if (d->kind == core::NodeKind::Class || d->kind == core::NodeKind::Function) names.push_back(d->name);
            if (names.size() >= kMaxNamesPerPackage) return names;
        }
    }
    return names;
}

std::vector<const core::Node*> direct_modules(const graph::Graph& g, const std::string& parent) {
    std::vector<const core::Node*> out;
    for (const core::Node* n : g.children(parent)) {
        if (n->kind == core::NodeKind::Module) out.push_back(n);
    }
    std::sort(out.begin(), out.end(), [](const core::Node* a, const core::Node* b) { return a->id < b->id; });
    return out;
}

}  // namespace

std::string build_digest(const graph::Graph& g, const std::vector<std::string>& main_guard_files, int max_chars) {
    std::vector<std::string> lines;
    int files = 0;
    int loc = 0;
    std::set<std::string> languages;
    std::vector<const core::Node*> packages;
    std::vector<std::string> externals;
    for (const core::Node* n : g.all_nodes()) {
        if (n->kind == core::NodeKind::Module) {
            ++files;
            loc += n->metrics.loc;
            if (!n->language.empty()) languages.insert(n->language);
        } else if (n->kind == core::NodeKind::Package) {
            packages.push_back(n);
        } else if (n->kind == core::NodeKind::External) {
            externals.push_back(n->name);
        }
    }
    const core::Node* project = g.find_node(core::kProjectNodeId);
    lines.push_back("Project " + (project ? project->name : std::string("?")) + ": " + std::to_string(files) + " files, " +
                    std::to_string(loc) + " lines, languages " + join({languages.begin(), languages.end()}, ", "));

    std::vector<std::string> entries;
    const nlohmann::json entry_points = analysis::build_entry_points(g, main_guard_files);  // keep it alive while looping
    for (const auto& e : entry_points["entry_points"]) entries.push_back(e["node_id"]);
    lines.push_back("Entry points: " + (entries.empty() ? std::string("none found") : join(entries, ", ")));

    const auto top = direct_modules(g, core::kProjectNodeId);
    if (!top.empty()) {
        lines.push_back("top level (" + std::to_string(top.size()) + " modules): " + join(definition_names(g, top), ", "));
    }
    std::stable_sort(packages.begin(), packages.end(), [](const core::Node* a, const core::Node* b) { return a->metrics.loc > b->metrics.loc; });
    for (const core::Node* p : packages) {
        const auto modules = direct_modules(g, p->id);
        lines.push_back("package " + p->qualified_name + " (" + std::to_string(modules.size()) + " modules): " +
                        join(definition_names(g, modules), ", "));
    }
    std::sort(externals.begin(), externals.end());
    lines.push_back("External libraries: " + (externals.empty() ? std::string("none") : join(externals, ", ")));

    std::string out;
    for (const std::string& line : lines) {
        const std::size_t needed = out.size() + line.size() + (out.empty() ? 0 : 1);
        if (max_chars >= 0 && needed > static_cast<std::size_t>(max_chars)) break;  // whole lines only
        out += (out.empty() ? "" : "\n") + line;
    }
    return out;
}

}  // namespace pv::grounding
