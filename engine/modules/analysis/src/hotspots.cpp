#include <algorithm>
#include <array>
#include <cmath>

#include "pv/analysis/analysis.hpp"
#include "pv/core/json.hpp"

namespace pv::analysis {

namespace {

constexpr int kMetrics = 4;  // complexity, fan_in, fan_out, loc

std::array<int, kMetrics> values_of(const core::Node& n) {
    return {n.metrics.complexity, n.metrics.fan_in, n.metrics.fan_out, n.metrics.loc};
}

std::string reason(int metric, int value) {
    switch (metric) {
        case 0: return "High complexity (" + std::to_string(value) + ")";
        case 1: return "Many callers (" + std::to_string(value) + ")";
        case 2: return "Many dependencies (" + std::to_string(value) + ")";
        default: return "Large (" + std::to_string(value) + " lines)";
    }
}

}  // namespace

Json build_hotspots(const graph::Graph& g, int limit) {
    std::vector<const core::Node*> candidates;
    for (const core::Node* n : g.all_nodes()) {
        if (n->kind == core::NodeKind::Function || n->kind == core::NodeKind::Method || n->kind == core::NodeKind::Module) {
            candidates.push_back(n);
        }
    }
    const std::array<double, kMetrics> weights = {0.30, 0.25, 0.25, 0.20};
    std::array<int, kMetrics> max_value{};
    std::array<int, kMetrics> p75{};
    for (int m = 0; m < kMetrics; ++m) {
        std::vector<int> values;
        for (const core::Node* n : candidates) values.push_back(values_of(*n)[m]);
        std::sort(values.begin(), values.end());
        max_value[m] = values.empty() ? 0 : values.back();
        p75[m] = values.empty() ? 0 : values[static_cast<std::size_t>(std::floor(0.75 * static_cast<double>(values.size() - 1)))];
    }

    struct Scored { const core::Node* node; int score; Json reasons; };
    std::vector<Scored> scored;
    for (const core::Node* n : candidates) {
        const auto v = values_of(*n);
        double total = 0.0;
        Json reasons = Json::array();
        for (int m = 0; m < kMetrics; ++m) {
            const double normalized = max_value[m] > 0 ? static_cast<double>(v[m]) / max_value[m] : 0.0;
            total += weights[m] * normalized;
            if (v[m] > 0 && v[m] >= p75[m]) reasons.push_back(reason(m, v[m]));
        }
        scored.push_back({n, static_cast<int>(std::lround(100.0 * total)), reasons});
    }
    std::sort(scored.begin(), scored.end(), [](const Scored& a, const Scored& b) {
        return a.score != b.score ? a.score > b.score : a.node->id < b.node->id;
    });
    if (limit >= 0 && scored.size() > static_cast<std::size_t>(limit)) scored.resize(static_cast<std::size_t>(limit));

    Json hotspots = Json::array();
    for (const Scored& s : scored) {
        hotspots.push_back({{"node_id", s.node->id},
                            {"kind", core::to_string(s.node->kind)},
                            {"name", s.node->name},
                            {"file_path", s.node->file_path},
                            {"score", s.score},
                            {"reasons", s.reasons},
                            {"metrics", s.node->metrics}});
    }
    return Json{{"hotspots", hotspots}};
}

}  // namespace pv::analysis
