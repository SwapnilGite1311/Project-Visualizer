#include "pv/gdiff/gdiff.hpp"

#include <map>
#include <set>
#include <string>
#include <vector>

namespace pv::gdiff {

namespace {

std::vector<std::string> changed_fields(const core::Node& a, const core::Node& b) {
    std::vector<std::string> fields;
    if (a.span.end_line - a.span.start_line != b.span.end_line - b.span.start_line) fields.push_back("span");
    if (a.metrics.loc != b.metrics.loc) fields.push_back("metrics.loc");
    if (a.metrics.complexity != b.metrics.complexity) fields.push_back("metrics.complexity");
    if (a.metrics.fan_in != b.metrics.fan_in) fields.push_back("metrics.fan_in");
    if (a.metrics.fan_out != b.metrics.fan_out) fields.push_back("metrics.fan_out");
    if (a.parent_id != b.parent_id) fields.push_back("parent_id");
    if (a.name != b.name) fields.push_back("name");
    return fields;
}

struct Counts {
    int added = 0, removed = 0, changed = 0;
};

// Adds one to every package among the ancestors of `id` in `g`.
void count_in_packages(const graph::Graph& g, const std::string& id, std::map<std::string, Counts>& packages, int Counts::*field) {
    for (const std::string& a : g.ancestors(id)) {
        if (a == id) continue;
        const core::Node* n = g.find_node(a);
        if (n && n->kind == core::NodeKind::Package) ++(packages[a].*field);
    }
}

}  // namespace

nlohmann::json compare_graphs(const graph::Graph& base, const graph::Graph& head) {
    std::vector<std::string> added, removed;
    nlohmann::json changed = nlohmann::json::array();
    std::map<std::string, Counts> packages;
    for (const core::Node* n : head.all_nodes()) {
        if (n->kind == core::NodeKind::Package) packages[n->id];
        const core::Node* old = base.find_node(n->id);
        if (!old) {
            added.push_back(n->id);
            count_in_packages(head, n->id, packages, &Counts::added);
            continue;
        }
        const auto fields = changed_fields(*old, *n);
        if (!fields.empty()) {
            changed.push_back({{"node_id", n->id}, {"fields", fields}});
            count_in_packages(head, n->id, packages, &Counts::changed);
        }
    }
    for (const core::Node* n : base.all_nodes()) {
        if (n->kind == core::NodeKind::Package) packages[n->id];
        if (head.find_node(n->id)) continue;
        removed.push_back(n->id);
        count_in_packages(base, n->id, packages, &Counts::removed);
    }
    std::set<std::string> base_edges, head_edges;
    for (const core::Edge* e : base.all_edges()) base_edges.insert(e->id);
    for (const core::Edge* e : head.all_edges()) head_edges.insert(e->id);
    int edges_added = 0, edges_removed = 0;
    for (const auto& id : head_edges) edges_added += base_edges.count(id) ? 0 : 1;
    for (const auto& id : base_edges) edges_removed += head_edges.count(id) ? 0 : 1;

    nlohmann::json pkgs = nlohmann::json::array();
    for (const auto& [id, c] : packages) {
        pkgs.push_back({{"node_id", id}, {"added", c.added}, {"removed", c.removed}, {"changed", c.changed}});
    }
    return {{"added", added},
            {"removed", removed},
            {"changed", changed},
            {"edges_added", edges_added},
            {"edges_removed", edges_removed},
            {"packages", pkgs}};
}

}  // namespace pv::gdiff
