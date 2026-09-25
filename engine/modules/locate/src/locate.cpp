#include "pv/locate/locate.hpp"

#include <algorithm>
#include <cctype>

#include "pv/core/paths.hpp"

namespace pv::locate {

std::optional<std::string> to_project_relative(const std::string& root_path, const std::string& file_path) {
    const std::string p = core::normalize_path(file_path);
    const bool drive = p.size() >= 2 && std::isalpha(static_cast<unsigned char>(p[0])) && p[1] == ':';
    if (!p.empty() && (p[0] == '/' || drive)) return core::path_relative_to(root_path, p);
    return p;
}

const core::Node* node_at(const graph::Graph& g, const std::string& rel_path, int line) {
    return g.innermost_at(rel_path, line);
}

std::vector<const core::Node*> file_nodes(const graph::Graph& g, const std::string& rel_path) {
    std::vector<const core::Node*> nodes = g.nodes_in_file(rel_path);
    std::sort(nodes.begin(), nodes.end(), [](const core::Node* a, const core::Node* b) {
        if (a->span.start_line != b->span.start_line) return a->span.start_line < b->span.start_line;
        return a->id < b->id;
    });
    return nodes;
}

}  // namespace pv::locate
