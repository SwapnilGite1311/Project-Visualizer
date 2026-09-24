#include <algorithm>
#include <map>

#include "pv/analysis/analysis.hpp"

namespace pv::analysis {

namespace {

std::vector<const core::Node*> of_kind(const graph::Graph& g, core::NodeKind kind) {
    std::vector<const core::Node*> out;
    for (const core::Node* n : g.all_nodes()) {
        if (n->kind == kind) out.push_back(n);
    }
    return out;
}

void sort_by_loc(std::vector<const core::Node*>& nodes) {
    std::sort(nodes.begin(), nodes.end(), [](const core::Node* a, const core::Node* b) {
        return a->metrics.loc != b->metrics.loc ? a->metrics.loc > b->metrics.loc : a->id < b->id;
    });
    if (nodes.size() > 10) nodes.resize(10);
}

}  // namespace

Json build_summary(const graph::Graph& g, const std::string& root_path,
                   const std::vector<std::string>& syntax_error_files, const std::vector<std::string>& parse_errors) {
    std::vector<const core::Node*> modules = of_kind(g, core::NodeKind::Module);

    std::map<std::string, std::pair<int, int>> languages;  // id -> (files, loc)
    for (const core::Node* m : modules) {
        auto& entry = languages[m->language];
        entry.first += 1;
        entry.second += m->metrics.loc;
    }
    Json langs = Json::array();
    for (const auto& [id, value] : languages) langs.push_back({{"id", id}, {"files", value.first}, {"loc", value.second}});

    Json counts = Json::object();
    for (core::NodeKind kind : {core::NodeKind::Project, core::NodeKind::Package, core::NodeKind::Module, core::NodeKind::Class,
                                core::NodeKind::Function, core::NodeKind::Method, core::NodeKind::Variable,
                                core::NodeKind::Statement, core::NodeKind::External}) {
        counts[core::to_string(kind)] = of_kind(g, kind).size();
    }

    std::vector<std::string> externals;
    for (const core::Node* e : of_kind(g, core::NodeKind::External)) externals.push_back(e->name);
    std::sort(externals.begin(), externals.end());

    std::vector<const core::Node*> largest_modules = modules;
    sort_by_loc(largest_modules);
    Json lm = Json::array();
    for (const core::Node* m : largest_modules) lm.push_back({{"node_id", m->id}, {"name", m->name}, {"loc", m->metrics.loc}});

    std::vector<const core::Node*> packages = of_kind(g, core::NodeKind::Package);
    sort_by_loc(packages);
    Json lp = Json::array();
    for (const core::Node* p : packages) {
        int module_count = 0;
        for (const std::string& d : g.descendants(p->id)) {
            if (g.node(d).kind == core::NodeKind::Module) ++module_count;
        }
        lp.push_back({{"node_id", p->id}, {"name", p->name}, {"loc", p->metrics.loc}, {"modules", module_count}});
    }

    const core::Node* project = g.find_node("project:");
    return Json{{"root_path", root_path},
                {"files", modules.size()},
                {"total_loc", project ? project->metrics.loc : 0},
                {"languages", langs},
                {"counts", counts},
                {"externals", externals},
                {"largest_modules", lm},
                {"largest_packages", lp},
                {"syntax_error_files", syntax_error_files},
                {"parse_errors", parse_errors}};
}

}  // namespace pv::analysis
