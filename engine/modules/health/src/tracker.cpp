#include <algorithm>
#include <set>

#include "pv/health/health.hpp"

namespace pv::health {
namespace {

const std::set<std::string> kSampleKinds{"call", "http_in", "http_out", "db_query", "message"};

}  // namespace

HealthTracker& tracker() {
    static HealthTracker instance;
    return instance;
}

void HealthTracker::on_events(const std::string& project_id, const std::vector<runtime::MappedEvent>& batch, int64_t now_ms) {
    std::lock_guard lock(mutex_);
    auto& nodes = stats_[project_id];
    for (const runtime::MappedEvent& m : batch) {
        if (m.node_id.empty()) continue;
        NodeStats& s = nodes[m.node_id];
        if (m.ev.kind == "stall") {
            s.mark_stall(now_ms);
        } else if (m.ev.kind == "error" || kSampleKinds.count(m.ev.kind)) {
            s.add({now_ms, m.ev.duration_ns, runtime::is_error_event(m.ev), m.ev.trace_id});
        }
    }
}

std::map<std::string, HealthInfo> HealthTracker::evaluate(const std::string& project_id, const graph::Graph& g, int64_t now_ms) {
    std::map<std::string, HealthInfo> own;
    {
        std::lock_guard lock(mutex_);
        const auto it = stats_.find(project_id);
        if (it == stats_.end()) return own;
        const Thresholds t = thresholds_.count(project_id) ? thresholds_.at(project_id) : Thresholds{};
        for (const auto& [node_id, s] : it->second) own[node_id] = s.evaluate(t, now_ms);
    }
    // Parents take the worst state of their children; parents without samples of their own sum their children.
    std::map<std::string, HealthInfo> result = own;
    for (const auto& [node_id, info] : own) {
        if (info.state == core::Health::Unknown || !g.find_node(node_id)) continue;
        for (const std::string& ancestor : g.ancestors(node_id)) {
            if (ancestor == node_id) continue;
            HealthInfo& a = result[ancestor];
            const bool has_own = own.count(ancestor) > 0;
            const bool child_is_worse = core::severity(info.state) > core::severity(a.state);
            a.state = core::worst(a.state, info.state);
            if (has_own) continue;
            a.calls += info.calls;
            a.errors += info.errors;
            a.error_rate = static_cast<double>(a.errors) / std::max(1, a.calls);
            a.p95_ms = std::max(a.p95_ms, info.p95_ms);
            a.stalled = a.stalled || info.stalled;
            if (child_is_worse || a.reason.empty()) {
                a.reason = "child: " + (info.reason.empty() ? core::to_string(info.state) : info.reason);
            }
        }
    }
    return result;
}

Thresholds HealthTracker::thresholds(const std::string& project_id) const {
    std::lock_guard lock(mutex_);
    const auto it = thresholds_.find(project_id);
    return it == thresholds_.end() ? Thresholds{} : it->second;
}

void HealthTracker::set_thresholds(const std::string& project_id, const Thresholds& t) {
    std::lock_guard lock(mutex_);
    thresholds_[project_id] = t;
}

void HealthTracker::clear(const std::string& project_id) {
    std::lock_guard lock(mutex_);
    stats_.erase(project_id);
}

void HealthTracker::reset_for_tests() {
    std::lock_guard lock(mutex_);
    stats_.clear();
    thresholds_.clear();
}

}  // namespace pv::health
