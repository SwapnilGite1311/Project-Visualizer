#include "pv/graph/level_view.hpp"

#include <algorithm>
#include <map>
#include <tuple>
#include <unordered_map>

#include "pv/core/ids.hpp"

namespace pv::graph {

LevelView build_level_view(const Graph& graph, const std::string& parent_id) {
    LevelView view;
    view.parent = graph.node(parent_id);
    for (const core::Node* child : graph.children(parent_id)) view.nodes.push_back(*child);

    std::unordered_map<std::string, std::string> display_of;
    for (const core::Node& child : view.nodes) {
        display_of[child.id] = child.id;
        for (const std::string& id : graph.descendants(child.id)) display_of[id] = child.id;
    }

    std::map<std::tuple<core::EdgeKind, std::string, std::string>, int> aggregate;
    for (const auto& [id, display] : display_of) {
        for (const core::Edge* e : graph.out_edges(id)) {
            auto target = display_of.find(e->target_id);
            if (target == display_of.end() || target->second == display) continue;
            aggregate[{e->kind, display, target->second}] += e->weight;
        }
    }

    for (const auto& [key, weight] : aggregate) {
        const auto& [kind, source, target] = key;
        core::Edge e;
        e.id = core::make_agg_edge_id(kind, source, target);
        e.kind = kind;
        e.source_id = source;
        e.target_id = target;
        e.weight = weight;
        e.resolved = true;
        view.edges.push_back(e);
    }

    std::sort(view.nodes.begin(), view.nodes.end(), [](const core::Node& a, const core::Node& b) {
        return std::tie(a.level, a.name, a.id) < std::tie(b.level, b.name, b.id);
    });
    std::sort(view.edges.begin(), view.edges.end(),
              [](const core::Edge& a, const core::Edge& b) { return a.id < b.id; });
    return view;
}

}  // namespace pv::graph
