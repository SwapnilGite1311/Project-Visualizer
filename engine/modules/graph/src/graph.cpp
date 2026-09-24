#include "pv/graph/graph.hpp"

#include <algorithm>

#include "pv/core/error.hpp"

namespace pv::graph {

namespace {

void erase_value(std::vector<std::string>& list, const std::string& value) {
    list.erase(std::remove(list.begin(), list.end(), value), list.end());
}

}  // namespace

bool Graph::add_node(const core::Node& node) {
    if (nodes_.count(node.id)) return false;
    nodes_.emplace(node.id, node);
    if (!node.parent_id.empty()) children_[node.parent_id].push_back(node.id);
    if (!node.file_path.empty()) by_file_[node.file_path].push_back(node.id);
    return true;
}

void Graph::add_edge(const core::Edge& edge) {
    auto it = edges_.find(edge.id);
    if (it != edges_.end()) {
        it->second.weight += edge.weight;
        return;
    }
    edges_.emplace(edge.id, edge);
    out_[edge.source_id].push_back(edge.id);
    in_[edge.target_id].push_back(edge.id);
}

const core::Node* Graph::find_node(const std::string& id) const {
    auto it = nodes_.find(id);
    return it == nodes_.end() ? nullptr : &it->second;
}

core::Node* Graph::find_node_mut(const std::string& id) {
    auto it = nodes_.find(id);
    return it == nodes_.end() ? nullptr : &it->second;
}

const core::Edge* Graph::find_edge(const std::string& id) const {
    auto it = edges_.find(id);
    return it == edges_.end() ? nullptr : &it->second;
}

const core::Node& Graph::node(const std::string& id) const {
    const core::Node* n = find_node(id);
    if (!n) throw core::PvError(core::err::NodeNotFound, "node not found: " + id);
    return *n;
}

std::vector<const core::Node*> Graph::children(const std::string& id) const {
    std::vector<const core::Node*> out;
    auto it = children_.find(id);
    if (it == children_.end()) return out;
    for (const std::string& child : it->second) {
        if (const core::Node* n = find_node(child)) out.push_back(n);
    }
    return out;
}

std::vector<const core::Edge*> Graph::out_edges(const std::string& id) const {
    std::vector<const core::Edge*> out;
    auto it = out_.find(id);
    if (it == out_.end()) return out;
    for (const std::string& edge_id : it->second) {
        if (const core::Edge* e = find_edge(edge_id)) out.push_back(e);
    }
    return out;
}

std::vector<const core::Edge*> Graph::in_edges(const std::string& id) const {
    std::vector<const core::Edge*> out;
    auto it = in_.find(id);
    if (it == in_.end()) return out;
    for (const std::string& edge_id : it->second) {
        if (const core::Edge* e = find_edge(edge_id)) out.push_back(e);
    }
    return out;
}

std::vector<const core::Node*> Graph::nodes_in_file(const std::string& file_path) const {
    std::vector<const core::Node*> out;
    auto it = by_file_.find(file_path);
    if (it == by_file_.end()) return out;
    for (const std::string& id : it->second) {
        if (const core::Node* n = find_node(id)) out.push_back(n);
    }
    return out;
}

std::vector<const core::Node*> Graph::all_nodes() const {
    std::vector<const core::Node*> out;
    out.reserve(nodes_.size());
    for (const auto& [id, n] : nodes_) out.push_back(&n);
    std::sort(out.begin(), out.end(), [](const core::Node* a, const core::Node* b) { return a->id < b->id; });
    return out;
}

std::vector<const core::Edge*> Graph::all_edges() const {
    std::vector<const core::Edge*> out;
    out.reserve(edges_.size());
    for (const auto& [id, e] : edges_) out.push_back(&e);
    std::sort(out.begin(), out.end(), [](const core::Edge* a, const core::Edge* b) { return a->id < b->id; });
    return out;
}

std::size_t Graph::node_count() const {
    return nodes_.size();
}

std::size_t Graph::edge_count() const {
    return edges_.size();
}

std::vector<std::string> Graph::ancestors(const std::string& id) const {
    const core::Node* current = &node(id);
    std::vector<std::string> chain{current->id};
    while (!current->parent_id.empty()) {
        const core::Node* parent = find_node(current->parent_id);
        if (!parent) break;
        chain.push_back(parent->id);
        current = parent;
    }
    std::reverse(chain.begin(), chain.end());
    return chain;
}

std::string Graph::ancestor_at_level(const std::string& id, int level) const {
    const core::Node* current = find_node(id);
    while (current) {
        if (current->level <= level) return current->id;
        if (current->parent_id.empty()) break;
        current = find_node(current->parent_id);
    }
    return "";
}

bool Graph::is_descendant(const std::string& id, const std::string& ancestor_id) const {
    if (!find_node(id)) return false;
    if (id == ancestor_id) return true;
    const std::vector<std::string> chain = ancestors(id);
    return std::find(chain.begin(), chain.end(), ancestor_id) != chain.end();
}

std::vector<std::string> Graph::descendants(const std::string& id) const {
    std::vector<std::string> out;
    std::vector<std::string> stack;
    const std::vector<const core::Node*> top = children(id);
    for (auto it = top.rbegin(); it != top.rend(); ++it) stack.push_back((*it)->id);
    while (!stack.empty()) {
        const std::string current = stack.back();
        stack.pop_back();
        out.push_back(current);
        const std::vector<const core::Node*> kids = children(current);
        for (auto it = kids.rbegin(); it != kids.rend(); ++it) stack.push_back((*it)->id);
    }
    return out;
}

std::size_t Graph::remove_file(const std::string& file_path) {
    auto file_it = by_file_.find(file_path);
    if (file_it == by_file_.end()) return 0;
    const std::vector<std::string> ids = file_it->second;
    std::size_t removed = 0;
    for (const std::string& id : ids) {
        auto node_it = nodes_.find(id);
        if (node_it == nodes_.end()) continue;

        std::vector<std::string> edge_ids;
        if (auto o = out_.find(id); o != out_.end()) edge_ids.insert(edge_ids.end(), o->second.begin(), o->second.end());
        if (auto i = in_.find(id); i != in_.end()) edge_ids.insert(edge_ids.end(), i->second.begin(), i->second.end());
        for (const std::string& edge_id : edge_ids) {
            auto edge_it = edges_.find(edge_id);
            if (edge_it == edges_.end()) continue;
            const core::Edge& e = edge_it->second;
            if (auto o = out_.find(e.source_id); o != out_.end()) erase_value(o->second, edge_id);
            if (auto i = in_.find(e.target_id); i != in_.end()) erase_value(i->second, edge_id);
            edges_.erase(edge_it);
        }

        const std::string parent_id = node_it->second.parent_id;
        if (auto c = children_.find(parent_id); c != children_.end()) erase_value(c->second, id);
        children_.erase(id);
        out_.erase(id);
        in_.erase(id);
        nodes_.erase(node_it);
        ++removed;
    }
    by_file_.erase(file_path);
    return removed;
}

const core::Node* Graph::innermost_at(const std::string& file_path, int line) const {
    const std::vector<const core::Node*> in_file = nodes_in_file(file_path);
    if (in_file.empty()) return nullptr;
    const core::Node* best = nullptr;
    const core::Node* module = nullptr;
    for (const core::Node* n : in_file) {
        if (n->kind == core::NodeKind::Module) module = n;
        const bool definition = n->kind == core::NodeKind::Class || n->kind == core::NodeKind::Function ||
                                n->kind == core::NodeKind::Method;
        if (!definition || line < n->span.start_line || line > n->span.end_line) continue;
        if (!best) {
            best = n;
            continue;
        }
        const int size = n->span.end_line - n->span.start_line;
        const int best_size = best->span.end_line - best->span.start_line;
        if (size < best_size || (size == best_size && n->span.start_line > best->span.start_line)) best = n;
    }
    return best ? best : module;
}

void Graph::clear() {
    nodes_.clear();
    edges_.clear();
    children_.clear();
    out_.clear();
    in_.clear();
    by_file_.clear();
}

}  // namespace pv::graph
