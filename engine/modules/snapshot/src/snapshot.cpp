#include "pv/snapshot/snapshot.hpp"

#include "pv/core/error.hpp"
#include "pv/core/json.hpp"
#include "pv/core/version.hpp"

namespace pv::snapshot {

namespace {
constexpr const char* kFormat = "pv-snapshot-1";
}

nlohmann::json export_snapshot(const graph::Graph& g) {
    nlohmann::json nodes = nlohmann::json::array();
    for (const core::Node* n : g.all_nodes()) nodes.push_back(*n);
    nlohmann::json edges = nlohmann::json::array();
    for (const core::Edge* e : g.all_edges()) edges.push_back(*e);
    const core::Node* project = g.find_node("project:");
    return {{"format", kFormat},
            {"engine_version", core::kEngineVersion},
            {"label", project ? project->name : ""},
            {"nodes", nodes},
            {"edges", edges}};
}

graph::Graph graph_from_snapshot(const nlohmann::json& snapshot) {
    if (!snapshot.is_object() || snapshot.value("format", "") != kFormat) {
        throw core::PvError(core::err::InvalidParams, "unsupported snapshot format");
    }
    graph::Graph g;
    try {
        for (const auto& n : snapshot.at("nodes")) g.add_node(n.get<core::Node>());
        for (const auto& e : snapshot.at("edges")) g.add_edge(e.get<core::Edge>());
    } catch (const nlohmann::json::exception& e) {
        throw core::PvError(core::err::InvalidParams, std::string("invalid snapshot: ") + e.what());
    }
    return g;
}

}  // namespace pv::snapshot
