#include "pv/graphapi/handlers.hpp"
#include "pv/session/registry.hpp"

void pv_register_graphapi(pv::session::Registry& reg) {
    using pv::graphapi::Json;
    pv::session::ProjectManager& pm = reg.projects;
    reg.methods.add("graph.node", [&pm](const Json& p) { return pv::graphapi::handle_node(pm, p); });
    reg.methods.add("graph.children", [&pm](const Json& p) { return pv::graphapi::handle_children(pm, p); });
    reg.methods.add("graph.level_view", [&pm](const Json& p) { return pv::graphapi::handle_level_view(pm, p); });
    reg.methods.add("graph.edges", [&pm](const Json& p) { return pv::graphapi::handle_edges(pm, p); });
    reg.methods.add("graph.source", [&pm](const Json& p) { return pv::graphapi::handle_source(pm, p); });
    reg.methods.add("graph.ancestors", [&pm](const Json& p) { return pv::graphapi::handle_ancestors(pm, p); });
}
