#include <map>
#include <set>
#include <unordered_map>

#include "pv/graph/level_view.hpp"
#include "pv/sim/replay.hpp"

namespace pv::sim {

nlohmann::json sim_flows(const Sandbox& sb, const graph::Graph& g, const std::vector<runtime::MappedEvent>& events,
                         const std::string& parent_id) {
    const graph::LevelView view = graph::build_level_view(g, parent_id);
    std::set<std::string> shown, edge_ids;
    for (const core::Node& n : view.nodes) shown.insert(n.id);
    for (const core::Edge& e : view.edges) edge_ids.insert(e.id);

    // The element of this level that is the node itself or contains it ("" when it is elsewhere), as in rtsync.
    std::unordered_map<std::string, std::string> cache;
    auto display_of = [&](const std::string& id) -> std::string {
        if (id.empty() || !g.find_node(id)) return "";
        const auto hit = cache.find(id);
        if (hit != cache.end()) return hit->second;
        std::string found;
        for (const std::string& a : g.ancestors(id)) {
            if (shown.count(a)) found = a;
        }
        return cache[id] = found;
    };

    std::map<std::pair<std::string, std::string>, std::pair<int, int>> flows;  // count, failed
    for (const auto& tr : detail::replay(sb, g, events, 500)) {
        for (const auto& s : tr.steps) {
            const std::string to = display_of(s.ev->node_id);
            const std::string parent_node =
                s.parent >= 0 ? tr.steps[static_cast<std::size_t>(s.parent)].ev->node_id : s.ev->parent_node_id;
            const std::string from = display_of(parent_node);
            if (to.empty() || from.empty() || from == to) continue;
            auto& f = flows[{from, to}];
            ++f.first;
            if (s.sim_failed) ++f.second;
        }
    }
    nlohmann::json out = nlohmann::json::array();
    for (const auto& [key, f] : flows) {
        const std::string edge = "agg|calls|" + key.first + "|" + key.second;
        out.push_back({{"source_id", key.first},
                       {"target_id", key.second},
                       {"count", f.first},
                       {"failed", f.second},
                       {"edge_id", edge_ids.count(edge) ? edge : ""}});
    }
    return {{"flows", out}};
}

}  // namespace pv::sim
