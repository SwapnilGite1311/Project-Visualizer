#pragma once
#include <cstddef>
#include <string>
#include <unordered_map>
#include <vector>
#include "pv/core/types.hpp"

namespace pv::graph {

class Graph {
public:
    bool add_node(const core::Node& node);   // false (and no change) if the id already exists
    void add_edge(const core::Edge& edge);   // existing id: weight += edge.weight; else insert
    const core::Node* find_node(const std::string& id) const;  // nullptr if missing
    core::Node* find_node_mut(const std::string& id);
    const core::Edge* find_edge(const std::string& id) const;
    const core::Node& node(const std::string& id) const;       // throws PvError(err::NodeNotFound)
    std::vector<const core::Node*> children(const std::string& id) const;   // insertion order
    std::vector<const core::Edge*> out_edges(const std::string& id) const;  // insertion order
    std::vector<const core::Edge*> in_edges(const std::string& id) const;   // insertion order
    std::vector<const core::Node*> nodes_in_file(const std::string& file_path) const;
    std::vector<const core::Node*> all_nodes() const;  // sorted by id
    std::vector<const core::Edge*> all_edges() const;  // sorted by id
    std::size_t node_count() const;
    std::size_t edge_count() const;
    std::vector<std::string> ancestors(const std::string& id) const;  // root first, ends with id
    std::string ancestor_at_level(const std::string& id, int level) const;
    bool is_descendant(const std::string& id, const std::string& ancestor_id) const;
    std::vector<std::string> descendants(const std::string& id) const;
    std::size_t remove_file(const std::string& file_path);
    const core::Node* innermost_at(const std::string& file_path, int line) const;
    void clear();

private:
    std::unordered_map<std::string, core::Node> nodes_;
    std::unordered_map<std::string, core::Edge> edges_;
    std::unordered_map<std::string, std::vector<std::string>> children_;  // parent id -> child ids
    std::unordered_map<std::string, std::vector<std::string>> out_;       // node id -> edge ids
    std::unordered_map<std::string, std::vector<std::string>> in_;        // node id -> edge ids
    std::unordered_map<std::string, std::vector<std::string>> by_file_;   // file path -> node ids
};

}  // namespace pv::graph
