#include <set>
#include <unordered_map>

#include "pv/builder/builder.hpp"
#include "pv/core/ids.hpp"

namespace pv::builder {

namespace {

bool starts_with(const std::string& text, const std::string& prefix) {
    return text.rfind(prefix, 0) == 0;
}

std::string drop_last_segment(const std::string& scope) {
    const std::size_t dot = scope.rfind('.');
    return dot == std::string::npos ? "" : scope.substr(0, dot);
}

}  // namespace

void link_calls(graph::Graph& g, const parse::FileExtraction& fx, const parse::LanguageAdapter& adapter,
                const parse::ProjectIndex& index, const FileBindings& bindings) {
    const std::string module_id = core::make_node_id(core::NodeKind::Module, fx.file_path, "");
    auto sym = [&](const std::string& qn) { return index.symbol_id(fx.file_path, qn).value_or(""); };
    std::unordered_map<std::string, core::NodeKind> kinds;
    for (const parse::RawDefinition& def : fx.definitions) kinds[def.qualname] = definition_kind(def);
    std::set<std::string> module_bindings;
    for (const auto& [name, id] : bindings) {
        if (starts_with(id, "module:")) module_bindings.insert(id);
    }

    for (const parse::RawCall& call : fx.calls) {
        const std::string caller = call.caller_qualname.empty() ? module_id : sym(call.caller_qualname);
        if (caller.empty()) continue;
        std::string target;

        if (call.object.empty()) {
            std::string scope = call.caller_qualname;
            while (true) {
                target = sym(scope.empty() ? call.name : scope + "." + call.name);
                if (!target.empty() || scope.empty()) break;
                scope = drop_last_segment(scope);
            }
            if (target.empty()) {
                auto bound = bindings.find(call.name);
                if (bound != bindings.end()) target = bound->second;
            }
            if (target.empty()) {
                for (const std::string& holder : module_bindings) {
                    target = index.symbol_id(holder.substr(7), call.name).value_or("");
                    if (!target.empty()) break;
                }
            }
        } else if (call.object == adapter.self_keyword() || call.object == "cls") {
            std::string scope = call.caller_qualname;
            while (!scope.empty()) {
                auto kind = kinds.find(scope);
                if (kind != kinds.end() && kind->second == core::NodeKind::Class) {
                    target = sym(scope + "." + call.name);
                    break;
                }
                scope = drop_last_segment(scope);
            }
        } else {
            std::string holder;
            auto bound = bindings.find(call.object);
            if (bound != bindings.end()) {
                holder = bound->second;
            } else {
                auto head = bindings.find(call.object.substr(0, call.object.find('.')));
                if (head != bindings.end() && starts_with(head->second, "external:")) holder = head->second;
            }
            if (starts_with(holder, "external:")) {
                target = holder;
            } else if (starts_with(holder, "module:")) {
                target = index.symbol_id(holder.substr(7), call.name).value_or("");
            } else if (starts_with(holder, "class:")) {
                if (const core::Node* cls = g.find_node(holder)) {
                    const std::string class_qn = holder.substr(holder.find('#') + 1);
                    target = index.symbol_id(cls->file_path, class_qn + "." + call.name).value_or("");
                }
            }
        }

        if (target.empty() || target == caller || !g.find_node(target)) continue;
        core::Edge e;
        e.id = core::make_edge_id(core::EdgeKind::Calls, caller, target);
        e.kind = core::EdgeKind::Calls;
        e.source_id = caller;
        e.target_id = target;
        e.weight = 1;
        e.resolved = true;
        g.add_edge(e);
    }
}

}  // namespace pv::builder
