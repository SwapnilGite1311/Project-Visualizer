#include "pv/builder/builder.hpp"
#include "pv/core/ids.hpp"

namespace pv::builder {

namespace {

void add_import_edge(graph::Graph& g, const std::string& source, const std::string& target) {
    core::Edge e;
    e.id = core::make_edge_id(core::EdgeKind::Imports, source, target);
    e.kind = core::EdgeKind::Imports;
    e.source_id = source;
    e.target_id = target;
    e.weight = 1;
    e.resolved = true;
    g.add_edge(e);
}

}  // namespace

FileBindings link_imports(graph::Graph& g, const parse::FileExtraction& fx, const parse::LanguageAdapter& adapter,
                          const parse::ProjectIndex& index) {
    const std::string module_id = core::make_node_id(core::NodeKind::Module, fx.file_path, "");
    FileBindings bindings;
    for (const parse::RawImport& imp : fx.imports) {
        const parse::ImportTarget target = adapter.resolve_import(imp, fx.file_path, index);
        const std::string local =
            !imp.alias.empty() ? imp.alias : (!imp.name.empty() && imp.name != "*" ? imp.name : imp.module);

        if (!target.node_id.empty()) {
            if (!g.find_node(target.node_id) || target.node_id == module_id) continue;
            add_import_edge(g, module_id, target.node_id);
            if (imp.name != "*") bindings[local] = target.node_id;
        } else if (!target.external_name.empty()) {
            const std::string ext = core::make_node_id(core::NodeKind::External, "", target.external_name);
            if (!g.find_node(ext)) {
                core::Node node;
                node.id = ext;
                node.kind = core::NodeKind::External;
                node.name = target.external_name;
                node.qualified_name = target.external_name;
                node.parent_id = core::kProjectNodeId;
                node.level = 1;
                g.add_node(node);
            }
            add_import_edge(g, module_id, ext);
            bindings[local] = ext;
        }
    }
    return bindings;
}

}  // namespace pv::builder
