#include "pv/builder/builder.hpp"
#include "pv/core/ids.hpp"

namespace pv::builder {

void link_inherits(graph::Graph& g, const parse::FileExtraction& fx, const parse::ProjectIndex& index,
                   const FileBindings& bindings) {
    for (const parse::RawInherit& inh : fx.inherits) {
        const std::string cls = index.symbol_id(fx.file_path, inh.class_qualname).value_or("");
        std::string target;
        auto bound = bindings.find(inh.base);
        if (bound != bindings.end()) {
            target = bound->second;
        } else if (const auto local = index.symbol_id(fx.file_path, inh.base)) {
            target = *local;
        } else if (const std::size_t dot = inh.base.rfind('.'); dot != std::string::npos) {
            const std::string head = inh.base.substr(0, dot);
            const std::string tail = inh.base.substr(dot + 1);
            auto holder = bindings.find(head);
            if (holder != bindings.end()) {
                if (holder->second.rfind("module:", 0) == 0) {
                    target = index.symbol_id(holder->second.substr(7), tail).value_or("");
                } else if (holder->second.rfind("external:", 0) == 0) {
                    target = holder->second;
                }
            }
        }
        if (cls.empty() || target.empty() || cls == target || !g.find_node(cls) || !g.find_node(target)) continue;
        core::Edge e;
        e.id = core::make_edge_id(core::EdgeKind::Inherits, cls, target);
        e.kind = core::EdgeKind::Inherits;
        e.source_id = cls;
        e.target_id = target;
        e.weight = 1;
        e.resolved = true;
        g.add_edge(e);
    }
}

}  // namespace pv::builder
