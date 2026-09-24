#pragma once
#include <nlohmann/json.hpp>
#include "pv/core/types.hpp"

namespace pv::core {
using Json = nlohmann::json;
void to_json(Json& j, const Span& s);
void from_json(const Json& j, Span& s);
void to_json(Json& j, const Metrics& m);
void from_json(const Json& j, Metrics& m);
}  // namespace pv::core
