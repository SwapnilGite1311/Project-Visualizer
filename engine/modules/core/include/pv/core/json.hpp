#pragma once
#include <nlohmann/json.hpp>
#include "pv/core/types.hpp"

namespace pv::core {
using Json = nlohmann::json;
void to_json(Json& j, const Span& s);
void from_json(const Json& j, Span& s);
void to_json(Json& j, const Metrics& m);
void from_json(const Json& j, Metrics& m);
void to_json(Json& j, const Node& n);
void from_json(const Json& j, Node& n);
void to_json(Json& j, const Edge& e);
void from_json(const Json& j, Edge& e);
}  // namespace pv::core
