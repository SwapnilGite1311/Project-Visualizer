#include "pv/gdiff/gdiff.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

void pv_register_gdiff(pv::session::Registry& reg) {
    reg.methods.add("gdiff.compare", [&reg](const pv::rpc::Json& p) {
        const auto base = reg.projects.get_ready(pv::rpc::require_string(p, "base_project_id"));
        const auto head = reg.projects.get_ready(pv::rpc::require_string(p, "head_project_id"));
        // Copy the base graph first, then read the head: never two graph locks at once.
        const pv::graph::Graph base_copy = base->read([](const pv::graph::Graph& g) { return g; });
        return head->read([&](const pv::graph::Graph& g) { return pv::gdiff::compare_graphs(base_copy, g); });
    });
}
