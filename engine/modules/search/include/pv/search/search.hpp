#pragma once
#include <string>
#include <vector>

#include "pv/core/types.hpp"
#include "pv/graph/graph.hpp"

namespace pv::search {

struct SearchHit { std::string node_id, name, kind, file_path, qualified_name; int score = 0; int level = 0; };
int score_match(const std::string& text, const core::Node& node);
std::vector<SearchHit> search_nodes(const graph::Graph& g, const std::string& text,
                                    const std::vector<core::NodeKind>& kinds, int limit);
std::vector<std::string> suggest_names(const graph::Graph& g, const std::string& prefix, int limit);

}  // namespace pv::search
