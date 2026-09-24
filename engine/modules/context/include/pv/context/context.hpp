#pragma once
#include <string>

#include <nlohmann/json.hpp>

#include "pv/graph/graph.hpp"

namespace pv::context {

nlohmann::json build_context_pack(const graph::Graph& g, const std::string& root_path, const std::string& node_id,
                                  int max_chars);

}  // namespace pv::context
