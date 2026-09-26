#pragma once
#include <cstdint>
#include <string>

#include <nlohmann/json.hpp>

#include "pv/graph/graph.hpp"
#include "pv/metrics/store.hpp"

namespace pv::metrics {

// Time series of one metric for a node and everything below it (R9 metrics.series): one point per bucket from
// `from_ms` to `to_ms`, empty buckets as 0. metric: calls | errors | stalls (sums), error_rate, p95_ms (max).
nlohmann::json series(const MetricsStore& store, const graph::Graph& g, const std::string& node_id, const std::string& metric,
                      int64_t from_ms, int64_t to_ms, int64_t bucket_ms);

// Writes the ML dataset CSV (columns of contracts/http/ml/dataset.schema.json) for rows whose node still exists.
nlohmann::json export_dataset(const MetricsStore& store, const graph::Graph& g, const std::string& out_path, int64_t from_minute);

}  // namespace pv::metrics
