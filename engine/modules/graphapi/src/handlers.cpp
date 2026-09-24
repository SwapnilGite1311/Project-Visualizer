#include "pv/graphapi/handlers.hpp"

#include <algorithm>
#include <map>

#include "pv/core/error.hpp"
#include "pv/core/json.hpp"
#include "pv/graph/level_view.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/source.hpp"

namespace pv::graphapi {

namespace {

std::shared_ptr<session::Project> ready_project(session::ProjectManager& pm, const Json& params) {
    return pm.get_ready(rpc::require_string(params, "project_id"));
}

}  // namespace

Json handle_node(session::ProjectManager& pm, const Json& params) {
    const auto p = ready_project(pm, params);
    const std::string id = rpc::require_string(params, "node_id");
    return p->read([&](const graph::Graph& g) { return Json(g.node(id)); });
}

Json handle_children(session::ProjectManager& pm, const Json& params) {
    const auto p = ready_project(pm, params);
    const std::string id = rpc::require_string(params, "node_id");
    return p->read([&](const graph::Graph& g) {
        g.node(id);
        Json nodes = Json::array();
        for (const core::Node* child : g.children(id)) nodes.push_back(*child);
        return Json{{"nodes", nodes}};
    });
}

Json handle_level_view(session::ProjectManager& pm, const Json& params) {
    const auto p = ready_project(pm, params);
    const std::string parent_id = rpc::optional_string(params, "parent_id", "project:");
    return p->read([&](const graph::Graph& g) {
        const graph::LevelView view = graph::build_level_view(g, parent_id);
        return Json{{"parent", view.parent}, {"nodes", view.nodes}, {"edges", view.edges}};
    });
}

Json handle_edges(session::ProjectManager& pm, const Json& params) {
    const auto p = ready_project(pm, params);
    const std::string id = rpc::require_string(params, "node_id");
    const std::string direction = rpc::optional_string(params, "direction", "both");
    if (direction != "in" && direction != "out" && direction != "both") {
        throw core::PvError(core::err::InvalidParams, "direction must be in, out or both");
    }
    std::vector<core::EdgeKind> kinds;
    for (const std::string& k : rpc::optional_string_list(params, "kinds")) {
        const auto kind = core::edge_kind_from_string(k);
        if (!kind) throw core::PvError(core::err::InvalidParams, "unknown edge kind: " + k);
        kinds.push_back(*kind);
    }
    return p->read([&](const graph::Graph& g) {
        g.node(id);
        std::map<std::string, core::Edge> picked;
        auto take = [&](const std::vector<const core::Edge*>& edges) {
            for (const core::Edge* e : edges) {
                if (kinds.empty() || std::find(kinds.begin(), kinds.end(), e->kind) != kinds.end()) {
                    picked.emplace(e->id, *e);
                }
            }
        };
        if (direction != "in") take(g.out_edges(id));
        if (direction != "out") take(g.in_edges(id));
        Json edges = Json::array();
        for (const auto& [edge_id, e] : picked) edges.push_back(e);
        return Json{{"edges", edges}};
    });
}

Json handle_source(session::ProjectManager& pm, const Json& params) {
    const auto p = ready_project(pm, params);
    const std::string id = rpc::require_string(params, "node_id");
    const core::Node node = p->read([&](const graph::Graph& g) { return g.node(id); });
    const std::string text = session::source_text_for(p->root_path(), node);
    return Json{{"file_path", node.file_path}, {"language", node.language}, {"text", text}, {"span", node.span}};
}

Json handle_ancestors(session::ProjectManager& pm, const Json& params) {
    const auto p = ready_project(pm, params);
    const std::string id = rpc::require_string(params, "node_id");
    return p->read([&](const graph::Graph& g) {
        Json nodes = Json::array();
        for (const std::string& ancestor : g.ancestors(id)) nodes.push_back(g.node(ancestor));
        return Json{{"nodes", nodes}};
    });
}

}  // namespace pv::graphapi
