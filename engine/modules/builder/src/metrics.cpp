#include "pv/builder/builder.hpp"

namespace pv::builder {

void compute_metrics(graph::Graph& g) {
    std::vector<std::string> ids;
    for (const core::Node* n : g.all_nodes()) ids.push_back(n->id);

    for (const std::string& id : ids) {
        int fan_in = 0;
        int fan_out = 0;
        for (const core::Edge* e : g.in_edges(id)) fan_in += e->weight;
        for (const core::Edge* e : g.out_edges(id)) fan_out += e->weight;
        core::Node* n = g.find_node_mut(id);
        n->metrics.fan_in = fan_in;
        n->metrics.fan_out = fan_out;
    }

    for (const std::string& id : ids) {
        core::Node* n = g.find_node_mut(id);
        if (n->kind != core::NodeKind::Module) continue;
        int complexity = 0;
        for (const std::string& d : g.descendants(id)) {
            const core::Node& child = g.node(d);
            if (child.kind == core::NodeKind::Function || child.kind == core::NodeKind::Method) {
                complexity += child.metrics.complexity;
            }
        }
        n->metrics.complexity = complexity;
    }

    for (const std::string& id : ids) {
        core::Node* n = g.find_node_mut(id);
        if (n->kind != core::NodeKind::Package && n->kind != core::NodeKind::Project) continue;
        int loc = 0;
        int complexity = 0;
        for (const std::string& d : g.descendants(id)) {
            const core::Node& child = g.node(d);
            if (child.kind != core::NodeKind::Module) continue;
            loc += child.metrics.loc;
            complexity += child.metrics.complexity;
        }
        n->metrics.loc = loc;
        n->metrics.complexity = complexity;
    }
}

}  // namespace pv::builder
