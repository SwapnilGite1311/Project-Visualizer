#pragma once
#include <optional>
#include <string>

#include "pv/core/types.hpp"

namespace pv::core {

inline constexpr const char* kProjectNodeId = "project:";
std::string make_node_id(NodeKind kind, const std::string& path, const std::string& qualname);
std::string make_statement_id(const std::string& file_path, const std::string& qualname, int line);
std::optional<NodeKind> kind_of_node_id(const std::string& id);
std::string make_edge_id(EdgeKind kind, const std::string& source_id, const std::string& target_id);     // "<kind>|<src>|<dst>"
std::string make_agg_edge_id(EdgeKind kind, const std::string& source_id, const std::string& target_id); // "agg|<kind>|<src>|<dst>"

}  // namespace pv::core
