#pragma once
#include <cstdint>
#include <deque>
#include <map>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/core/types.hpp"
#include "pv/graph/graph.hpp"
#include "pv/runtime/hub.hpp"

namespace pv::health {

struct Thresholds {
    int window_ms = 60000;
    double error_rate = 0.05;
    int warn_p95_ms = 1000;
    int stall_ms = 5000;
    int loop_calls = 1000;
};

struct HealthInfo {
    core::Health state = core::Health::Unknown;
    int calls = 0;
    int errors = 0;
    double error_rate = 0.0;
    int p95_ms = 0;
    bool stalled = false;
    std::string reason;
};

struct Sample {
    int64_t at_ms;
    int64_t duration_ns;
    bool error;
    std::string trace_id;
};

class NodeStats {  // one per node
public:
    void add(const Sample& s);
    void mark_stall(int64_t at_ms);
    HealthInfo evaluate(const Thresholds& t, int64_t now_ms) const;

private:
    std::deque<Sample> samples_;  // pruned to the last hour, at most 1,000
    int64_t last_stall_ms_ = 0;
    int64_t last_error_ms_ = 0;
    int64_t last_ok_after_stall_ms_ = 0;
    std::unordered_map<std::string, int> calls_per_trace_;
};

class HealthTracker {
public:
    void on_events(const std::string& project_id, const std::vector<runtime::MappedEvent>& batch, int64_t now_ms);
    std::map<std::string, HealthInfo> evaluate(const std::string& project_id, const graph::Graph& g, int64_t now_ms);
    Thresholds thresholds(const std::string& project_id) const;
    void set_thresholds(const std::string& project_id, const Thresholds& t);
    void clear(const std::string& project_id);
    void reset_for_tests();

private:
    mutable std::mutex mutex_;
    std::unordered_map<std::string, std::unordered_map<std::string, NodeStats>> stats_;
    std::unordered_map<std::string, Thresholds> thresholds_;
};

HealthTracker& tracker();
nlohmann::json to_json(const HealthInfo& info);

}  // namespace pv::health
