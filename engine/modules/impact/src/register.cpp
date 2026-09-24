#include "pv/impact/impact.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

void pv_register_impact(pv::session::Registry& reg) {
    using pv::rpc::Json;
    pv::session::ProjectManager& pm = reg.projects;
    reg.methods.add("impact.analyze", [&pm](const Json& params) {
        const auto p = pm.get_ready(pv::rpc::require_string(params, "project_id"));
        const std::string node_id = pv::rpc::require_string(params, "node_id");
        const int max_depth = pv::rpc::optional_int(params, "max_depth", 5);
        return p->read([&](const pv::graph::Graph& g) {
            return pv::impact::to_json(pv::impact::analyze_impact(g, node_id, max_depth));
        });
    });
}
