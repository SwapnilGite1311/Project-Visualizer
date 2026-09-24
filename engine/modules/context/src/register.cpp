#include "pv/context/context.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

void pv_register_context(pv::session::Registry& reg) {
    using pv::rpc::Json;
    pv::session::ProjectManager& pm = reg.projects;
    reg.methods.add("context.for_node", [&pm](const Json& params) {
        const auto p = pm.get_ready(pv::rpc::require_string(params, "project_id"));
        const int max_chars = pv::rpc::clamp_int(pv::rpc::optional_int(params, "max_chars", 12000), 1000, 100000);
        const std::string node_id = pv::rpc::require_string(params, "node_id");
        return p->read([&](const pv::graph::Graph& g) {
            return pv::context::build_context_pack(g, p->root_path(), node_id, max_chars);
        });
    });
}
