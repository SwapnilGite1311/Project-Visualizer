#include <unordered_map>

#include "pv/builder/builder.hpp"
#include "pv/core/ids.hpp"

namespace pv::builder {

void add_definition_nodes(graph::Graph& g, const parse::FileExtraction& fx, const parse::LanguageAdapter& adapter) {
    const std::string module_id = core::make_node_id(core::NodeKind::Module, fx.file_path, "");
    const std::vector<std::string> names = adapter.module_names(fx.file_path);
    const std::string module_qn = names.empty() ? "" : names[0];
    if (core::Node* module = g.find_node_mut(module_id)) {
        module->qualified_name = module_qn;
        module->span = core::Span{1, 0, fx.loc, 0};
        module->language = fx.language;
        module->metrics.loc = fx.loc;
    }

    std::unordered_map<std::string, core::NodeKind> kind_of;
    for (const parse::RawDefinition& def : fx.definitions) kind_of[def.qualname] = definition_kind(def);

    for (const parse::RawDefinition& def : fx.definitions) {
        const core::NodeKind kind = kind_of[def.qualname];
        core::Node node;
        node.id = core::make_node_id(kind, fx.file_path, def.qualname);
        node.kind = kind;
        auto parent = kind_of.find(def.parent_qualname);
        node.parent_id = (def.parent_qualname.empty() || parent == kind_of.end())
                             ? module_id
                             : core::make_node_id(parent->second, fx.file_path, def.parent_qualname);
        node.name = def.name;
        node.qualified_name = module_qn.empty() ? def.qualname : module_qn + "." + def.qualname;
        node.file_path = fx.file_path;
        node.language = fx.language;
        node.span = def.span;
        node.level = core::level_of(kind);
        node.metrics.complexity = def.complexity;
        node.metrics.loc = def.span.end_line - def.span.start_line + 1;
        g.add_node(node);
    }
}

}  // namespace pv::builder
