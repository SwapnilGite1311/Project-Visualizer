#include <algorithm>
#include <functional>
#include <map>
#include <set>

#include "pv/deps/deps.hpp"

namespace pv::deps {

std::vector<std::vector<std::string>> find_cycles(const graph::Graph& g, int level, int limit) {
    level = std::clamp(level, 1, 4);
    limit = std::clamp(limit, 1, 100);

    // The element at `level` that contains x, or "" if x has none at exactly that level.
    auto group = [&](const std::string& x) -> std::string {
        const std::string a = g.ancestor_at_level(x, level);
        const core::Node* n = a.empty() ? nullptr : g.find_node(a);
        return n && n->level == level ? a : "";
    };

    std::map<std::string, std::set<std::string>> adjacency;
    for (const core::Edge* e : g.all_edges()) {
        if (e->kind == core::EdgeKind::References) continue;
        const std::string from = group(e->source_id);
        const std::string to = group(e->target_id);
        if (from.empty() || to.empty() || from == to) continue;
        adjacency[from].insert(to);
        adjacency[to];
    }

    // Tarjan's strongly connected components.
    std::map<std::string, int> index, low;
    std::set<std::string> on_stack;
    std::vector<std::string> stack;
    std::vector<std::vector<std::string>> components;
    int counter = 0;
    std::function<void(const std::string&)> connect = [&](const std::string& v) {
        index[v] = low[v] = counter++;
        stack.push_back(v);
        on_stack.insert(v);
        for (const std::string& w : adjacency[v]) {
            if (!index.count(w)) {
                connect(w);
                low[v] = std::min(low[v], low[w]);
            } else if (on_stack.count(w)) {
                low[v] = std::min(low[v], index[w]);
            }
        }
        if (low[v] != index[v]) return;
        std::vector<std::string> component;
        std::string w;
        do {
            w = stack.back();
            stack.pop_back();
            on_stack.erase(w);
            component.push_back(w);
        } while (w != v);
        if (component.size() >= 2) {
            std::sort(component.begin(), component.end());
            components.push_back(std::move(component));
        }
    };
    for (const auto& [v, targets] : adjacency) {
        if (!index.count(v)) connect(v);
    }

    std::sort(components.begin(), components.end(), [](const auto& a, const auto& b) {
        if (a.size() != b.size()) return a.size() > b.size();
        return a.front() < b.front();
    });
    if (static_cast<int>(components.size()) > limit) components.resize(limit);
    return components;
}

}  // namespace pv::deps
