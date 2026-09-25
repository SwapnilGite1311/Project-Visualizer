#include "pv/core/error.hpp"
#include "pv/core/json.hpp"
#include "pv/locate/locate.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

void pv_register_locate(pv::session::Registry& reg) {
    using pv::rpc::Json;
    pv::session::ProjectManager& pm = reg.projects;

    reg.methods.add("locate.node_at", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string file = pv::rpc::require_string(p, "file_path");
        const int line = pv::rpc::optional_int(p, "line", 0);
        if (line < 1) throw pv::core::PvError(pv::core::err::InvalidParams, "line must be 1 or more");
        const auto rel = pv::locate::to_project_relative(project->root_path(), file);
        return project->read([&](const pv::graph::Graph& g) {
            const pv::core::Node* n = rel ? pv::locate::node_at(g, *rel, line) : nullptr;
            return Json{{"node", n ? Json(*n) : Json(nullptr)}};
        });
    });

    reg.methods.add("locate.file_nodes", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const auto rel = pv::locate::to_project_relative(project->root_path(), pv::rpc::require_string(p, "file_path"));
        return project->read([&](const pv::graph::Graph& g) {
            Json nodes = Json::array();
            if (rel) {
                for (const pv::core::Node* n : pv::locate::file_nodes(g, *rel)) nodes.push_back(*n);
            }
            return Json{{"nodes", nodes}};
        });
    });
}
