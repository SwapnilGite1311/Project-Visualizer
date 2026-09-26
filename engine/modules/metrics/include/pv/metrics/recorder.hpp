#pragma once
#include <cstdint>
#include <map>
#include <memory>
#include <mutex>
#include <string>
#include <utility>
#include <vector>

#include "pv/metrics/store.hpp"
#include "pv/runtime/hub.hpp"

namespace pv::metrics {

// Turns live runtime events into per-minute history (calls, errors, p95 latency, stalls per node).
class Recorder {
public:
    void on_events(const std::string& pid, const std::string& root, const std::vector<runtime::MappedEvent>& batch, int64_t now_ms);
    // Writes finished minutes (older than the current one), or every bucket when `all`.
    void flush(const std::string& pid, int64_t now_ms, bool all);
    MetricsStore* store_for(const std::string& pid, const std::string& root);  // opened on first use
    void reset_for_tests();

private:
    struct Bucket {
        int calls = 0, errors = 0, stalls = 0;
        double total_ms = 0;
        std::vector<double> durations_ms;
    };
    struct ProjectState {
        std::string root;
        std::unique_ptr<MetricsStore> store;
        std::map<std::pair<std::string, int64_t>, Bucket> buckets;
        int64_t last_flush_ms = 0;
    };
    void flush_locked(ProjectState& p, int64_t now_ms, bool all);
    std::mutex mutex_;
    std::map<std::string, ProjectState> projects_;
};

Recorder& recorder();

}  // namespace pv::metrics
