#include "pv/core/error.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"
#include "pv/snapshot/snapshot.hpp"

void pv_register_snapshot(pv::session::Registry& reg) {
    using pv::rpc::Json;
    pv::session::ProjectManager& pm = reg.projects;

    reg.methods.add("snapshot.export", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        return project->read([](const pv::graph::Graph& g) { return pv::snapshot::export_snapshot(g); });
    });

    reg.methods.add("snapshot.load", [&pm](const Json& p) {
        if (!p.is_object() || !p.contains("snapshot")) {
            throw pv::core::PvError(pv::core::err::InvalidParams, "missing param: snapshot");
        }
        const Json& snapshot = p.at("snapshot");
        pv::graph::Graph g = pv::snapshot::graph_from_snapshot(snapshot);
        return Json{{"project_id", pm.adopt(snapshot.value("label", "snapshot"), std::move(g))}};
    });
}
