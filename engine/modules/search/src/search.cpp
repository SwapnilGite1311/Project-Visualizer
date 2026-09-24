#include "pv/search/search.hpp"

#include <algorithm>
#include <set>
#include <tuple>

#include "pv/core/text.hpp"

namespace pv::search {

int score_match(const std::string& text, const core::Node& node) {
    const std::string t = core::to_lower(text);
    const std::string name = core::to_lower(node.name);
    if (name == t) return 100;
    if (name.rfind(t, 0) == 0) return 80;
    if (name.find(t) != std::string::npos) return 60;
    if (core::to_lower(node.qualified_name).find(t) != std::string::npos) return 40;
    if (core::is_subsequence_ci(text, node.name)) return 20;
    return 0;
}

std::vector<SearchHit> search_nodes(const graph::Graph& g, const std::string& text,
                                    const std::vector<core::NodeKind>& kinds, int limit) {
    std::vector<SearchHit> hits;
    for (const core::Node* n : g.all_nodes()) {
        if (n->kind == core::NodeKind::Project) continue;
        if (!kinds.empty() && std::find(kinds.begin(), kinds.end(), n->kind) == kinds.end()) continue;
        const int score = score_match(text, *n);
        if (score <= 0) continue;
        hits.push_back(SearchHit{n->id, n->name, core::to_string(n->kind), n->file_path, n->qualified_name, score, n->level});
    }
    std::sort(hits.begin(), hits.end(), [](const SearchHit& a, const SearchHit& b) {
        return std::make_tuple(-a.score, a.level, a.name, a.node_id) < std::make_tuple(-b.score, b.level, b.name, b.node_id);
    });
    if (limit >= 0 && hits.size() > static_cast<std::size_t>(limit)) hits.resize(static_cast<std::size_t>(limit));
    return hits;
}

std::vector<std::string> suggest_names(const graph::Graph& g, const std::string& prefix, int limit) {
    const std::string p = core::to_lower(prefix);
    std::set<std::string> names;
    for (const core::Node* n : g.all_nodes()) {
        if (n->kind == core::NodeKind::Project) continue;
        if (core::to_lower(n->name).rfind(p, 0) == 0) names.insert(n->name);
    }
    std::vector<std::string> out(names.begin(), names.end());
    std::sort(out.begin(), out.end(), [](const std::string& a, const std::string& b) {
        return a.size() != b.size() ? a.size() < b.size() : a < b;
    });
    if (limit >= 0 && out.size() > static_cast<std::size_t>(limit)) out.resize(static_cast<std::size_t>(limit));
    return out;
}

}  // namespace pv::search
