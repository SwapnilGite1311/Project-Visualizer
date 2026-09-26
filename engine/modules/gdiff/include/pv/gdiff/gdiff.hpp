#pragma once
#include <nlohmann/json.hpp>

#include "pv/graph/graph.hpp"

namespace pv::gdiff {

// What changed between two versions of a project (R9 gdiff.compare): added / removed / changed node ids, edge counts
// and per-package totals. Spans are compared by their line count, so code that only moved is not "changed".
nlohmann::json compare_graphs(const graph::Graph& base, const graph::Graph& head);

}  // namespace pv::gdiff
