#include <algorithm>

#include "pv/builder/builder.hpp"
#include "pv/incremental/incremental.hpp"

namespace pv::incremental {
namespace {

bool same_node(const core::Node& a, const core::Node& b) {
    return a.name == b.name && a.parent_id == b.parent_id && a.span.start_line == b.span.start_line && a.span.start_col == b.span.start_col &&
           a.span.end_line == b.span.end_line && a.span.end_col == b.span.end_col && a.metrics.loc == b.metrics.loc &&
           a.metrics.complexity == b.metrics.complexity && a.metrics.fan_in == b.metrics.fan_in && a.metrics.fan_out == b.metrics.fan_out;
}

}  // namespace

graph::Graph rebuild_graph(const parse::AdapterRegistry& adapters, const std::string& root, const ExtractionMap& extractions) {
    graph::Graph g;
    std::vector<std::string> files;
    std::vector<parse::FileExtraction> fxs;
    files.reserve(extractions.size());
    fxs.reserve(extractions.size());
    for (const auto& [rel, fx] : extractions) {
        files.push_back(rel);
        fxs.push_back(fx);
    }
    builder::add_structure_nodes(g, root, files, [&](const std::string& rel) {
        const auto it = extractions.find(rel);
        return it == extractions.end() ? std::string() : it->second.language;
    });
    for (const parse::FileExtraction& fx : fxs) {
        if (const parse::LanguageAdapter* adapter = adapters.by_id(fx.language)) builder::add_definition_nodes(g, fx, *adapter);
    }
    const parse::ProjectIndex index = builder::build_index(fxs, adapters);
    for (const parse::FileExtraction& fx : fxs) {
        const parse::LanguageAdapter* adapter = adapters.by_id(fx.language);
        if (!adapter) continue;
        const builder::FileBindings bindings = builder::link_imports(g, fx, *adapter, index);
        builder::link_calls(g, fx, *adapter, index, bindings);
        builder::link_inherits(g, fx, index, bindings);
    }
    builder::compute_metrics(g);
    return g;
}

GraphDiff diff_graphs(const graph::Graph& before, const graph::Graph& after) {
    GraphDiff diff;
    for (const core::Node* n : after.all_nodes()) {
        const core::Node* old = before.find_node(n->id);
        if (!old) diff.added.push_back(n->id);
        else if (!same_node(*old, *n)) diff.updated.push_back(n->id);
    }
    for (const core::Node* n : before.all_nodes()) {
        if (!after.find_node(n->id)) diff.removed.push_back(n->id);
    }
    return diff;  // all_nodes() is sorted by id
}

}  // namespace pv::incremental
