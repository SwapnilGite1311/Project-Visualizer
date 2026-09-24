#include "pv/context/context.hpp"

#include <algorithm>
#include <set>

#include "pv/core/error.hpp"
#include "pv/core/json.hpp"
#include "pv/session/source.hpp"

namespace pv::context {

namespace {

using Json = nlohmann::json;

Json ref(const core::Node& n) {
    return Json{{"id", n.id}, {"kind", core::to_string(n.kind)}, {"name", n.name}};
}

Json ref_file(const core::Node& n) {
    Json j = ref(n);
    j["file_path"] = n.file_path;
    return j;
}

std::vector<const core::Node*> sorted_by_id(std::vector<const core::Node*> nodes) {
    std::sort(nodes.begin(), nodes.end(), [](const core::Node* a, const core::Node* b) { return a->id < b->id; });
    nodes.erase(std::unique(nodes.begin(), nodes.end()), nodes.end());
    return nodes;
}

std::vector<const core::Node*> edge_ends(const graph::Graph& g, const std::vector<const core::Edge*>& edges,
                                         core::EdgeKind kind, bool use_source) {
    std::vector<const core::Node*> out;
    for (const core::Edge* e : edges) {
        if (e->kind != kind) continue;
        if (const core::Node* n = g.find_node(use_source ? e->source_id : e->target_id)) out.push_back(n);
    }
    return sorted_by_id(out);
}

}  // namespace

nlohmann::json build_context_pack(const graph::Graph& g, const std::string& root_path, const std::string& node_id,
                                  int max_chars) {
    const core::Node& node = g.node(node_id);
    Json pack;
    pack["node"] = node;

    std::string source;
    if (node.kind == core::NodeKind::Module || node.kind == core::NodeKind::Class ||
        node.kind == core::NodeKind::Function || node.kind == core::NodeKind::Method) {
        try {
            source = session::source_text_for(root_path, node);
        } catch (const core::PvError&) {
            source.clear();
        }
    }
    const bool truncated = max_chars >= 0 && source.size() > static_cast<std::size_t>(max_chars);
    if (truncated) source.resize(static_cast<std::size_t>(max_chars));
    pack["source"] = source;
    pack["source_truncated"] = truncated;

    std::set<std::string> related{node.id};
    const core::Node* parent = node.parent_id.empty() ? nullptr : g.find_node(node.parent_id);
    pack["parent"] = parent ? ref(*parent) : Json(nullptr);
    if (parent) related.insert(parent->id);

    auto add_list = [&](const char* key, const std::vector<const core::Node*>& nodes, std::size_t cap, bool with_file) {
        Json list = Json::array();
        for (std::size_t i = 0; i < nodes.size() && i < cap; ++i) {
            list.push_back(with_file ? ref_file(*nodes[i]) : ref(*nodes[i]));
            related.insert(nodes[i]->id);
        }
        pack[key] = list;
    };
    add_list("children", sorted_by_id(g.children(node.id)), 50, false);
    add_list("callers", edge_ends(g, g.in_edges(node.id), core::EdgeKind::Calls, true), 20, true);
    add_list("callees", edge_ends(g, g.out_edges(node.id), core::EdgeKind::Calls, false), 20, true);
    if (node.kind == core::NodeKind::Module) {
        add_list("imports", edge_ends(g, g.out_edges(node.id), core::EdgeKind::Imports, false), 30, false);
    } else {
        pack["imports"] = Json::array();
    }
    pack["related_node_ids"] = related;
    pack["approx_tokens"] = static_cast<int>(pack.dump().size() / 4);
    return pack;
}

}  // namespace pv::context
