#pragma once
#include <optional>
#include <string>
#include <vector>

#include "pv/core/types.hpp"
#include "pv/graph/graph.hpp"

namespace pv::locate {

// Absolute paths (starting with "/" or "X:") are made relative to root_path (nullopt when outside it);
// relative paths are only normalized. Separators become "/".
std::optional<std::string> to_project_relative(const std::string& root_path, const std::string& file_path);

// The innermost class/function/method containing the line, else the module node; nullptr if the file is unknown.
const core::Node* node_at(const graph::Graph& g, const std::string& rel_path, int line);

// Every node of the file, sorted by start line, then id.
std::vector<const core::Node*> file_nodes(const graph::Graph& g, const std::string& rel_path);

}  // namespace pv::locate
