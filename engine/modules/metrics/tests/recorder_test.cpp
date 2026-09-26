#include <gtest/gtest.h>

#include "metrics_fixture.hpp"

using namespace pv::metrics;
using namespace pv::metrics::testing;

TEST(MetricsRecorder, BucketsPerMinuteWithP95) {
    DataDir dir;
    auto& rec = recorder();
    std::vector<pv::runtime::MappedEvent> batch;
    for (int i = 1; i <= 20; ++i) batch.push_back(mapped("f", 100, i));  // 1..20 ms in minute 100
    batch.push_back(mapped("f", 100, 50, "error"));
    batch.push_back(mapped("f", 101, 3));
    batch.push_back(mapped("f", 101, 0, "ok", "stall"));
    batch.push_back(mapped("g", 101, 7));
    batch.push_back(mapped("", 101, 7));  // not mapped to a node: ignored
    rec.on_events("p1", dir.dir.generic_string() + "/proj", batch, 101 * 60000 + 5);

    // Minute 100 is finished at "now" = minute 101, so it was already written; 101 is still open.
    MetricsStore* store = rec.store_for("p1", "");
    EXPECT_EQ(store->all_since(0).size(), 1u);
    rec.flush("p1", 101 * 60000 + 6, true);
    const auto f = store->query({"f"}, 0, 1000);
    ASSERT_EQ(f.size(), 2u);
    EXPECT_EQ(f[0].minute, 100);
    EXPECT_EQ(f[0].calls, 21);
    EXPECT_EQ(f[0].errors, 1);
    EXPECT_DOUBLE_EQ(f[0].p95_ms, 20);  // 95th percentile of 1..20 and 50
    EXPECT_EQ(f[1].calls, 1);
    EXPECT_EQ(f[1].stalls, 1);
    EXPECT_EQ(store->query({"g"}, 0, 1000).size(), 1u);
}
