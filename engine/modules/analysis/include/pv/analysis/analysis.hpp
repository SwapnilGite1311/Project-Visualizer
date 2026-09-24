#pragma once
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/graph/graph.hpp"

namespace pv::analysis {

using Json = nlohmann::json;

Json build_summary(const graph::Graph& g, const std::string& root_path,
                   const std::vector<std::string>& syntax_error_files, const std::vector<std::string>& parse_errors);
Json build_hotspots(const graph::Graph& g, int limit);
Json build_entry_points(const graph::Graph& g, const std::vector<std::string>& main_guard_files);
Json build_boundaries(const graph::Graph& g);
Json build_call_tree(const graph::Graph& g, const std::string& node_id, int depth);

}  // namespace pv::analysis
