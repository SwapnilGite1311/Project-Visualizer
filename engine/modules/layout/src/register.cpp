#include <algorithm>
#include <cstdint>

#include "pv/cache/project_cache.hpp"
#include "pv/core/error.hpp"
#include "pv/graph/level_view.hpp"
#include "pv/layout/layout.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

namespace {

using pv::rpc::Json;

// A version of what the layout depends on (the ids and labels of the level view); 52 bits so it survives JSON.
int64_t view_version(const pv::graph::LevelView& view) {
    uint64_t h = 14695981039346656037ULL;
    auto mix = [&h](const std::string& s) {
        for (const unsigned char c : s) {
            h ^= c;
            h *= 1099511628211ULL;
        }
        h ^= 0x1f;
        h *= 1099511628211ULL;
    };
    mix(view.parent.id);
    for (const auto& n : view.nodes) {
        mix(n.id);
        mix(n.name);
    }
    for (const auto& e : view.edges) mix(e.id);
    return static_cast<int64_t>(h & ((uint64_t{1} << 52) - 1));
}

Json point_json(const pv::layout::Point& p, bool with_z) {
    Json j{{"x", p.x}, {"y", p.y}};
    if (with_z) j["z"] = p.z;
    return j;
}

}  // namespace

void pv_register_layout(pv::session::Registry& reg) {
    reg.methods.add("layout.compute", [&reg](const Json& p) {
        const auto project = reg.projects.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string parent_id = pv::rpc::optional_string(p, "parent_id", "project:");
        const std::string mode = pv::rpc::require_string(p, "mode");
        if (mode != "2d" && mode != "3d") throw pv::core::PvError(pv::core::err::InvalidParams, "mode must be 2d or 3d");
        const std::string rankdir = pv::rpc::optional_string(p, "rankdir", "TB");
        if (rankdir != "TB" && rankdir != "LR") throw pv::core::PvError(pv::core::err::InvalidParams, "rankdir must be TB or LR");

        const pv::graph::LevelView view =
            project->read([&](const pv::graph::Graph& g) { return pv::graph::build_level_view(g, parent_id); });
        const int64_t version = view_version(view);
        const std::string key = mode + ":" + rankdir + ":" + parent_id + ":" + std::to_string(version);
        pv::cache::ProjectCache* cache = pv::cache::shared_cache(project->root_path());
        if (cache) {
            if (auto hit = cache->get_layout(key)) {
                (*hit)["cached"] = true;
                return *hit;
            }
        }

        std::vector<pv::layout::LNode> nodes;
        for (const auto& n : view.nodes) {
            const double chars = static_cast<double>(n.name.size());
            nodes.push_back(pv::layout::LNode{n.id, std::clamp(40.0 + 7.0 * chars, 80.0, 260.0), 48});
        }
        std::vector<pv::layout::LEdge> edges;
        for (const auto& e : view.edges) edges.push_back(pv::layout::LEdge{e.id, e.source_id, e.target_id});

        pv::layout::LayoutResult layout;
        if (mode == "2d") {
            pv::layout::LayeredOptions options;
            options.rankdir = rankdir;
            layout = pv::layout::layered(nodes, edges, options);
        } else {
            // 300 iterations for normal views; fewer for very large ones so the answer stays well under a second.
            const int n = static_cast<int>(nodes.size());
            layout = pv::layout::force3d(nodes, edges, n > 500 ? std::max(80, 300 * 500 / n) : 300);
        }
        Json positions = Json::object();
        for (const auto& [id, pt] : layout.positions) positions[id] = point_json(pt, mode == "3d");
        Json edge_points = Json::object();
        for (const auto& [id, pts] : layout.edge_points) {
            Json list = Json::array();
            for (const auto& pt : pts) list.push_back(point_json(pt, false));
            edge_points[id] = list;
        }
        Json result{{"graph_version", version}, {"cached", false}, {"positions", positions}, {"edges", edge_points}};
        if (cache) cache->put_layout(key, result);
        return result;
    });
}
