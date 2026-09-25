#include "pv/core/error.hpp"
#include "pv/deps/deps.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

namespace {

using pv::rpc::Json;

std::vector<pv::core::EdgeKind> parse_kinds(const Json& p) {
    std::vector<pv::core::EdgeKind> kinds;
    for (const std::string& k : pv::rpc::optional_string_list(p, "kinds")) {
        const auto kind = pv::core::edge_kind_from_string(k);
        if (!kind) throw pv::core::PvError(pv::core::err::InvalidParams, "unknown edge kind: " + k);
        kinds.push_back(*kind);
    }
    return kinds;
}

}  // namespace

void pv_register_deps(pv::session::Registry& reg) {
    pv::session::ProjectManager& pm = reg.projects;

    reg.methods.add("deps.neighbors", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string id = pv::rpc::require_string(p, "node_id");
        const std::string direction = pv::rpc::optional_string(p, "direction", "both");
        const int depth = pv::rpc::optional_int(p, "depth", 1);
        const auto kinds = parse_kinds(p);
        return project->read([&](const pv::graph::Graph& g) { return pv::deps::to_json(pv::deps::neighbors(g, id, direction, depth, kinds)); });
    });

    reg.methods.add("deps.focus", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string id = pv::rpc::require_string(p, "node_id");
        const int radius = pv::rpc::optional_int(p, "radius", 1);
        return project->read([&](const pv::graph::Graph& g) { return pv::deps::to_json(pv::deps::neighbors(g, id, "both", radius, {})); });
    });

    reg.methods.add("deps.path", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string from = pv::rpc::require_string(p, "from_id");
        const std::string to = pv::rpc::require_string(p, "to_id");
        const int max_depth = pv::rpc::optional_int(p, "max_depth", 8);
        const auto kinds = parse_kinds(p);
        return project->read([&](const pv::graph::Graph& g) { return pv::deps::to_json(pv::deps::find_path(g, from, to, kinds, max_depth)); });
    });

    reg.methods.add("deps.cycles", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const int level = pv::rpc::optional_int(p, "level", 2);
        const int limit = pv::rpc::optional_int(p, "limit", 20);
        return project->read([&](const pv::graph::Graph& g) {
            Json cycles = Json::array();
            for (const auto& c : pv::deps::find_cycles(g, level, limit)) cycles.push_back({{"node_ids", c}});
            return Json{{"cycles", cycles}};
        });
    });
}
