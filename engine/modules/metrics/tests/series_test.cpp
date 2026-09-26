#include <gtest/gtest.h>

#include <fstream>
#include <sstream>

#include "../../graph/tests/sample_graph.hpp"
#include "metrics_fixture.hpp"
#include "pv/core/error.hpp"
#include "pv/metrics/series.hpp"

using namespace pv;
using namespace pv::metrics;
using namespace pv::metrics::testing;

TEST(MetricsSeries, BucketsIncludeDescendantsAndEmptyBuckets) {
    DataDir dir;
    MetricsStore store(dir.db("s.db"));
    store.upsert({MinuteRow{"function:app/a.py#f", 0, 4, 1, 0, 30, 0}, MinuteRow{"method:app/a.py#C.m", 1, 6, 0, 0, 80, 0},
                  MinuteRow{"function:main.py#main", 1, 100, 0, 0, 5, 0}});
    const graph::Graph g = graph::testing::sample_graph();
    // module:app/a.py covers f and C.m; three one-minute buckets from 0 to 2 min.
    const auto calls = series(store, g, "module:app/a.py", "calls", 0, 120000, 60000)["points"];
    ASSERT_EQ(calls.size(), 3u);
    EXPECT_EQ(calls[0]["v"], 4);
    EXPECT_EQ(calls[1]["v"], 6);
    EXPECT_EQ(calls[2]["v"], 0);
    EXPECT_EQ(calls[1]["t"], 60000);
    const auto rate = series(store, g, "module:app/a.py", "error_rate", 0, 60000, 120000)["points"];
    ASSERT_EQ(rate.size(), 1u);
    EXPECT_DOUBLE_EQ(rate[0]["v"].get<double>(), 0.1);  // 1 error / 10 calls
    EXPECT_DOUBLE_EQ(series(store, g, "module:app/a.py", "p95_ms", 0, 60000, 120000)["points"][0]["v"].get<double>(), 80);
    EXPECT_THROW(series(store, g, "module:app/a.py", "weird", 0, 1, 60000), core::PvError);
    EXPECT_THROW(series(store, g, "nope", "calls", 0, 1, 60000), core::PvError);
}

TEST(MetricsSeries, ExportWritesTheDatasetColumns) {
    DataDir dir;
    MetricsStore store(dir.db("e.db"));
    store.upsert({MinuteRow{"function:app/a.py#f", 5, 4, 1, 0, 30, 2}, MinuteRow{"function:gone.py#x", 5, 1, 0, 0, 1, 0}});
    const std::string out = dir.db("dataset.csv");
    const auto r = export_dataset(store, graph::testing::sample_graph(), out, 0);
    EXPECT_EQ(r["rows"], 1);  // the removed node is skipped
    std::stringstream ss;
    ss << std::ifstream(out).rdbuf();
    std::string header, line;
    std::getline(ss, header);
    std::getline(ss, line);
    EXPECT_EQ(header, "node_id,kind,level,minute,loc,complexity,fan_in,fan_out,calls,errors,p95_ms,stalls");
    EXPECT_EQ(line, "function:app/a.py#f,function,4,5,0,0,0,0,4,1,30,2");
}
