#pragma once
#include <nlohmann/json.hpp>

#include "pv/graph/graph.hpp"

namespace pv::snapshot {

// {"format":"pv-snapshot-1","engine_version","label","nodes","edges"} — names, paths, spans and metrics only, never source code.
nlohmann::json export_snapshot(const graph::Graph& g);

// Rebuilds a graph; throws PvError(err::InvalidParams, "unsupported snapshot format") for other formats.
graph::Graph graph_from_snapshot(const nlohmann::json& snapshot);

}  // namespace pv::snapshot
