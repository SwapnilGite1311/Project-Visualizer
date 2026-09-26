#include "pv/metrics/series.hpp"

#include <algorithm>
#include <filesystem>
#include <fstream>
#include <map>
#include <sstream>

#include "pv/core/error.hpp"

namespace pv::metrics {

namespace {

constexpr std::size_t kMaxNodes = 5000;

std::vector<std::string> node_and_descendants(const graph::Graph& g, const std::string& id) {
    std::vector<std::string> out{id};
    for (std::size_t i = 0; i < out.size() && out.size() < kMaxNodes; ++i) {
        for (const core::Node* c : g.children(out[i])) {
            if (out.size() >= kMaxNodes) break;
            out.push_back(c->id);
        }
    }
    return out;
}

std::string csv_field(const std::string& s) {
    if (s.find_first_of(",\"\n") == std::string::npos) return s;
    std::string q = "\"";
    for (const char c : s) {
        if (c == '"') q += '"';
        q += c;
    }
    return q + "\"";
}

}  // namespace

nlohmann::json series(const MetricsStore& store, const graph::Graph& g, const std::string& node_id, const std::string& metric,
                      int64_t from_ms, int64_t to_ms, int64_t bucket_ms) {
    if (metric != "calls" && metric != "errors" && metric != "stalls" && metric != "error_rate" && metric != "p95_ms") {
        throw core::PvError(core::err::InvalidParams, "unknown metric: " + metric);
    }
    if (!g.find_node(node_id)) throw core::PvError(core::err::NodeNotFound, "node not found: " + node_id);
    bucket_ms = std::clamp<int64_t>(bucket_ms, 60000, 86400000);
    if (to_ms < from_ms) std::swap(from_ms, to_ms);
    const int64_t first = from_ms / bucket_ms * bucket_ms;
    const std::size_t count = static_cast<std::size_t>((to_ms - first) / bucket_ms + 1);
    if (count > 20000) throw core::PvError(core::err::InvalidParams, "too many buckets; use a larger bucket_ms");

    struct Acc {
        double calls = 0, errors = 0, stalls = 0, p95 = 0;
    };
    std::vector<Acc> acc(count);
    for (const MinuteRow& r : store.query(node_and_descendants(g, node_id), from_ms / 60000, to_ms / 60000)) {
        const int64_t t = r.minute * 60000;
        if (t < first) continue;
        const auto i = static_cast<std::size_t>((t - first) / bucket_ms);
        if (i >= count) continue;
        acc[i].calls += r.calls;
        acc[i].errors += r.errors;
        acc[i].stalls += r.stalls;
        acc[i].p95 = std::max(acc[i].p95, r.p95_ms);
    }
    nlohmann::json points = nlohmann::json::array();
    for (std::size_t i = 0; i < count; ++i) {
        const Acc& a = acc[i];
        double v = 0;
        if (metric == "calls") v = a.calls;
        else if (metric == "errors") v = a.errors;
        else if (metric == "stalls") v = a.stalls;
        else if (metric == "error_rate") v = a.errors / std::max(1.0, a.calls);
        else v = a.p95;
        points.push_back({{"t", first + static_cast<int64_t>(i) * bucket_ms}, {"v", v}});
    }
    return {{"points", points}};
}

nlohmann::json export_dataset(const MetricsStore& store, const graph::Graph& g, const std::string& out_path, int64_t from_minute) {
    const std::vector<std::string> columns{"node_id", "kind",  "level",  "minute", "loc",    "complexity",
                                           "fan_in",  "fan_out", "calls", "errors", "p95_ms", "stalls"};
    std::ofstream out(std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(out_path.data()), out_path.size())),
                      std::ios::binary | std::ios::trunc);
    if (!out) throw core::PvError(core::err::Io, "cannot write " + out_path);
    for (std::size_t i = 0; i < columns.size(); ++i) out << (i ? "," : "") << columns[i];
    out << "\n";
    int rows = 0;
    for (const MinuteRow& r : store.all_since(from_minute)) {
        const core::Node* n = g.find_node(r.node_id);
        if (!n) continue;
        std::ostringstream p95;
        p95 << r.p95_ms;
        out << csv_field(r.node_id) << ',' << core::to_string(n->kind) << ',' << n->level << ',' << r.minute << ',' << n->metrics.loc
            << ',' << n->metrics.complexity << ',' << n->metrics.fan_in << ',' << n->metrics.fan_out << ',' << r.calls << ','
            << r.errors << ',' << p95.str() << ',' << r.stalls << "\n";
        ++rows;
    }
    return {{"rows", rows}, {"out_path", out_path}, {"columns", columns}};
}

}  // namespace pv::metrics
