#include <gtest/gtest.h>

#include "pv/health/health.hpp"

using namespace pv;
using health::NodeStats;
using health::Sample;
using health::Thresholds;

namespace {
constexpr int64_t kMs = 1000000;  // nanoseconds per millisecond
}

TEST(HealthStats, OkErrorAndSlow) {
    const Thresholds t;
    NodeStats ok;
    for (int i = 0; i < 100; ++i) ok.add({1000 + i, 5 * kMs, false, "t" + std::to_string(i)});
    const auto good = ok.evaluate(t, 20000);
    EXPECT_EQ(good.state, core::Health::Ok);
    EXPECT_EQ(good.calls, 100);
    EXPECT_EQ(good.p95_ms, 5);

    NodeStats failing;
    for (int i = 0; i < 100; ++i) failing.add({1000 + i, kMs, i % 10 == 0, "t" + std::to_string(i)});
    const auto bad = failing.evaluate(t, 20000);
    EXPECT_EQ(bad.state, core::Health::Error);
    EXPECT_EQ(bad.errors, 10);
    EXPECT_DOUBLE_EQ(bad.error_rate, 0.1);

    NodeStats slow;
    for (int i = 0; i < 20; ++i) slow.add({1000 + i, 2000 * kMs, false, "t" + std::to_string(i)});
    const auto s = slow.evaluate(t, 20000);
    EXPECT_EQ(s.state, core::Health::Warning);
    EXPECT_EQ(s.reason.rfind("slow", 0), 0u);
    EXPECT_EQ(s.p95_ms, 2000);
}

TEST(HealthStats, RecentErrorsStallsAndLoops) {
    const Thresholds t;
    NodeStats one_error;
    for (int i = 0; i < 99; ++i) one_error.add({1000, kMs, false, ""});
    one_error.add({1000, kMs, true, ""});
    EXPECT_EQ(one_error.evaluate(t, 5000).state, core::Health::Error);    // error in the last 10 s
    EXPECT_EQ(one_error.evaluate(t, 20000).state, core::Health::Warning);  // 1 % errors, older than 10 s

    NodeStats stalled;
    stalled.add({1000, kMs, false, ""});
    stalled.mark_stall(2000);
    EXPECT_EQ(stalled.evaluate(t, 3000).state, core::Health::Stalled);
    EXPECT_TRUE(stalled.evaluate(t, 3000).stalled);
    stalled.add({2500, kMs, false, ""});
    EXPECT_FALSE(stalled.evaluate(t, 3000).stalled);
    EXPECT_EQ(stalled.evaluate(t, 3000).state, core::Health::Ok);

    NodeStats loop;
    for (int i = 0; i < 1001; ++i) loop.add({1000, kMs, false, "same-trace"});
    const auto l = loop.evaluate(t, 2000);
    EXPECT_EQ(l.state, core::Health::Warning);
    EXPECT_EQ(l.reason, "possible loop");

    EXPECT_EQ(NodeStats{}.evaluate(t, 1000).state, core::Health::Unknown);
}
