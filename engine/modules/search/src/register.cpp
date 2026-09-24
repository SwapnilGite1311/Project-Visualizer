#include "pv/core/error.hpp"
#include "pv/rpc/params.hpp"
#include "pv/search/search.hpp"
#include "pv/session/registry.hpp"

void pv_register_search(pv::session::Registry& reg) {
    using pv::rpc::Json;
    pv::session::ProjectManager& pm = reg.projects;

    reg.methods.add("search.query", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string text = pv::rpc::require_string(p, "text");
        std::vector<pv::core::NodeKind> kinds;
        for (const std::string& k : pv::rpc::optional_string_list(p, "kinds")) {
            const auto kind = pv::core::node_kind_from_string(k);
            if (!kind) throw pv::core::PvError(pv::core::err::InvalidParams, "unknown node kind: " + k);
            kinds.push_back(*kind);
        }
        const int limit = pv::rpc::clamp_int(pv::rpc::optional_int(p, "limit", 50), 1, 200);
        return project->read([&](const pv::graph::Graph& g) {
            Json results = Json::array();
            for (const pv::search::SearchHit& h : pv::search::search_nodes(g, text, kinds, limit)) {
                results.push_back({{"node_id", h.node_id},
                                   {"name", h.name},
                                   {"kind", h.kind},
                                   {"file_path", h.file_path},
                                   {"qualified_name", h.qualified_name},
                                   {"score", h.score}});
            }
            return Json{{"results", results}};
        });
    });

    reg.methods.add("search.suggest", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string prefix = pv::rpc::require_string(p, "prefix");
        const int limit = pv::rpc::clamp_int(pv::rpc::optional_int(p, "limit", 10), 1, 50);
        return project->read([&](const pv::graph::Graph& g) {
            return Json{{"suggestions", pv::search::suggest_names(g, prefix, limit)}};
        });
    });
}
