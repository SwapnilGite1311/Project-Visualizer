#include <algorithm>
#include <cmath>

#include "pv/health/health.hpp"

namespace pv::health {
namespace {

constexpr int64_t kKeepMs = 60LL * 60 * 1000;  // an hour of samples
constexpr std::size_t kMaxSamples = 1000;
constexpr std::size_t kMaxTraces = 10000;
constexpr int64_t kRecentErrorMs = 10000;

}  // namespace

void NodeStats::add(const Sample& s) {
    samples_.push_back(s);
    while (!samples_.empty() && (samples_.front().at_ms < s.at_ms - kKeepMs || samples_.size() > kMaxSamples)) samples_.pop_front();
    if (s.error) last_error_ms_ = std::max(last_error_ms_, s.at_ms);
    else if (last_stall_ms_ > 0 && s.at_ms >= last_stall_ms_) last_ok_after_stall_ms_ = s.at_ms;
    if (!s.trace_id.empty()) {
        if (calls_per_trace_.size() > kMaxTraces) calls_per_trace_.clear();
        ++calls_per_trace_[s.trace_id];
    }
}

void NodeStats::mark_stall(int64_t at_ms) { last_stall_ms_ = std::max(last_stall_ms_, at_ms); }

HealthInfo NodeStats::evaluate(const Thresholds& t, int64_t now_ms) const {
    HealthInfo info;
    std::vector<int64_t> durations;
    for (const Sample& s : samples_) {
        if (s.at_ms < now_ms - t.window_ms) continue;
        ++info.calls;
        if (s.error) ++info.errors;
        durations.push_back(s.duration_ns);
    }
    info.error_rate = static_cast<double>(info.errors) / std::max(1, info.calls);
    if (!durations.empty()) {
        std::sort(durations.begin(), durations.end());
        const auto index = static_cast<std::size_t>(std::ceil(0.95 * static_cast<double>(durations.size()))) - 1;
        info.p95_ms = static_cast<int>(durations[index] / 1000000);
    }
    info.stalled = last_stall_ms_ > 0 && now_ms - last_stall_ms_ <= 2LL * t.stall_ms && last_ok_after_stall_ms_ < last_stall_ms_;
    const bool loop = std::any_of(calls_per_trace_.begin(), calls_per_trace_.end(), [&](const auto& p) { return p.second > t.loop_calls; });
    const bool recent_error = last_error_ms_ > 0 && now_ms - last_error_ms_ < kRecentErrorMs;

    if ((info.calls >= 1 && info.error_rate >= t.error_rate) || recent_error) {
        info.state = core::Health::Error;
        info.reason = "errors (" + std::to_string(static_cast<int>(std::lround(info.error_rate * 100))) + "%)";
    } else if (info.stalled) {
        info.state = core::Health::Stalled;
        info.reason = "stalled";
    } else if (info.errors > 0) {
        info.state = core::Health::Warning;
        info.reason = "errors";
    } else if (info.p95_ms > t.warn_p95_ms) {
        info.state = core::Health::Warning;
        info.reason = "slow (p95 " + std::to_string(info.p95_ms) + " ms)";
    } else if (loop) {
        info.state = core::Health::Warning;
        info.reason = "possible loop";
    } else if (info.calls > 0) {
        info.state = core::Health::Ok;
    }
    return info;
}

nlohmann::json to_json(const HealthInfo& info) {
    return {{"state", core::to_string(info.state)}, {"calls", info.calls},     {"errors", info.errors}, {"error_rate", info.error_rate},
            {"p95_ms", info.p95_ms},                 {"stalled", info.stalled}, {"reason", info.reason}};
}

}  // namespace pv::health
