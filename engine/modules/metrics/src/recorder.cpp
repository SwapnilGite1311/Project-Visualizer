#include "pv/metrics/recorder.hpp"

#include <algorithm>
#include <cmath>

#include "pv/core/log.hpp"

namespace pv::metrics {

namespace {

constexpr int64_t kNsPerMinute = 60LL * 1000 * 1000 * 1000;
constexpr int64_t kFlushEveryMs = 10000;

double p95(std::vector<double>& v) {
    if (v.empty()) return 0;
    std::sort(v.begin(), v.end());
    const auto idx = static_cast<std::size_t>(std::ceil(0.95 * static_cast<double>(v.size()))) - 1;
    return v[std::min(idx, v.size() - 1)];
}

}  // namespace

Recorder& recorder() {
    static Recorder instance;
    return instance;
}

MetricsStore* Recorder::store_for(const std::string& pid, const std::string& root) {
    std::lock_guard<std::mutex> lock(mutex_);
    ProjectState& p = projects_[pid];
    if (p.root.empty()) p.root = root;
    if (!p.store) p.store = std::make_unique<MetricsStore>(db_path_for(p.root));
    return p.store.get();
}

void Recorder::on_events(const std::string& pid, const std::string& root, const std::vector<runtime::MappedEvent>& batch,
                         int64_t now_ms) {
    std::lock_guard<std::mutex> lock(mutex_);
    ProjectState& p = projects_[pid];
    if (p.root.empty()) p.root = root;
    for (const runtime::MappedEvent& m : batch) {
        if (m.node_id.empty()) continue;
        const int64_t minute = m.ev.start_ns / kNsPerMinute;
        Bucket& b = p.buckets[{m.node_id, minute}];
        if (m.ev.kind == "stall") {
            ++b.stalls;
            continue;
        }
        const bool error = runtime::is_error_event(m.ev);
        if (m.ev.kind == "error") {  // an error report without a span: count the error only
            ++b.errors;
            continue;
        }
        ++b.calls;
        if (error) ++b.errors;
        const double ms = static_cast<double>(m.ev.duration_ns) / 1e6;
        b.total_ms += ms;
        b.durations_ms.push_back(ms);
    }
    if (now_ms - p.last_flush_ms >= kFlushEveryMs) flush_locked(p, now_ms, false);
}

void Recorder::flush(const std::string& pid, int64_t now_ms, bool all) {
    std::lock_guard<std::mutex> lock(mutex_);
    const auto it = projects_.find(pid);
    if (it != projects_.end()) flush_locked(it->second, now_ms, all);
}

void Recorder::flush_locked(ProjectState& p, int64_t now_ms, bool all) {
    p.last_flush_ms = now_ms;
    const int64_t current_minute = now_ms / 60000;
    std::vector<MinuteRow> rows;
    for (auto it = p.buckets.begin(); it != p.buckets.end();) {
        if (!all && it->first.second >= current_minute) {
            ++it;
            continue;
        }
        Bucket& b = it->second;
        rows.push_back(MinuteRow{it->first.first, it->first.second, b.calls, b.errors, b.total_ms, p95(b.durations_ms), b.stalls});
        it = p.buckets.erase(it);
    }
    if (rows.empty()) return;
    try {
        if (!p.store) p.store = std::make_unique<MetricsStore>(db_path_for(p.root));
        p.store->upsert(rows);
    } catch (const std::exception& e) {
        core::log_warn(std::string("metrics: cannot save history: ") + e.what());
    }
}

void Recorder::reset_for_tests() {
    std::lock_guard<std::mutex> lock(mutex_);
    projects_.clear();
}

}  // namespace pv::metrics
