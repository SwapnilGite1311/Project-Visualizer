#include <unordered_set>

#include "pv/analysis/analysis.hpp"

namespace pv::analysis {

Json build_boundaries(const graph::Graph& g) {
    Json packages = Json::array();
    const std::vector<const core::Edge*> edges = g.all_edges();
    for (const core::Node* p : g.all_nodes()) {  // all_nodes is sorted by id
        if (p->kind != core::NodeKind::Package) continue;
        std::unordered_set<std::string> inside;
        inside.insert(p->id);
        for (const std::string& d : g.descendants(p->id)) inside.insert(d);
        int internal = 0;
        int outgoing = 0;
        int incoming = 0;
        for (const core::Edge* e : edges) {
            const bool src = inside.count(e->source_id) > 0;
            const bool dst = inside.count(e->target_id) > 0;
            if (src && dst) ++internal;
            else if (src) ++outgoing;
            else if (dst) ++incoming;
        }
        const double instability =
            (incoming + outgoing) == 0 ? 0.0 : static_cast<double>(outgoing) / static_cast<double>(incoming + outgoing);
        packages.push_back({{"node_id", p->id},
                            {"name", p->name},
                            {"internal_edges", internal},
                            {"outgoing_edges", outgoing},
                            {"incoming_edges", incoming},
                            {"instability", instability}});
    }
    return Json{{"packages", packages}};
}

}  // namespace pv::analysis
