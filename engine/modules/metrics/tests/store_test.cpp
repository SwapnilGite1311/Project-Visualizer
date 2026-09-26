#include <gtest/gtest.h>

#include "metrics_fixture.hpp"

using namespace pv::metrics;
using namespace pv::metrics::testing;

TEST(MetricsStore, UpsertMergesAndQueriesByRange) {
    DataDir dir;
    {
        MetricsStore store(dir.db("a.db"));
        store.upsert({MinuteRow{"n1", 10, 2, 1, 20, 12, 0}, MinuteRow{"n1", 11, 1, 0, 5, 5, 1}});
        store.upsert({MinuteRow{"n1", 10, 3, 0, 30, 15, 0}});
        const auto rows = store.query({"n1", "missing"}, 10, 10);
        ASSERT_EQ(rows.size(), 1u);
        EXPECT_EQ(rows[0].calls, 5);
        EXPECT_EQ(rows[0].errors, 1);
        EXPECT_DOUBLE_EQ(rows[0].total_ms, 50);
        EXPECT_DOUBLE_EQ(rows[0].p95_ms, 15);  // max of the two
        EXPECT_EQ(store.query({"n1"}, 0, 100).size(), 2u);
        EXPECT_EQ(store.all_since(11).size(), 1u);
    }
    MetricsStore reopened(dir.db("a.db"));  // data survives
    EXPECT_EQ(reopened.all_since(0).size(), 2u);
}

TEST(MetricsStore, PathPerProject) {
    DataDir dir;
    const std::string a = db_path_for("C:/code/a");
    EXPECT_NE(a, db_path_for("C:/code/b"));
    EXPECT_EQ(a.rfind(dir.dir.generic_string() + "/metrics/", 0), 0u);
    EXPECT_EQ(a.substr(a.size() - 3), ".db");
}
