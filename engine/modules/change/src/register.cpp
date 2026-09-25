#include <chrono>

#include "pv/change/change.hpp"
#include "pv/core/error.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

void pv_register_change(pv::session::Registry& reg) {
    pv::session::ProjectManager& pm = reg.projects;
    reg.methods.add("change.preview", [&pm](const pv::rpc::Json& p) {
        const std::string pid = pv::rpc::require_string(p, "project_id");
        const auto project = pm.get_ready(pid);
        if (!p.contains("change")) throw pv::core::PvError(pv::core::err::InvalidParams, "change is required");
        const pv::change::Change c = pv::change::change_from_json(p["change"]);
        const int64_t now =
            std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();
        return project->read([&](const pv::graph::Graph& g) {
            g.node(c.node_id);  // NodeNotFound when it does not exist
            return pv::change::preview(g, c, pv::health::tracker().evaluate(pid, g, now));
        });
    });
}
