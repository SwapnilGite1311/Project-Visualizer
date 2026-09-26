#include <gtest/gtest.h>

#include <chrono>

#include "metrics_fixture.hpp"
#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_metrics(pv::session::Registry& reg);

using namespace pv;
using namespace pv::metrics::testing;

TEST(MetricsRpc, LiveEventsBecomeSeriesAndDataset) {
    DataDir dir;
    runtime::hub().reset_for_tests();
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_metrics(*env.reg);
    const std::string pid = env.open_and_wait(session::pyproj_small_path());
    const auto project = env.projects->get(pid);

    const int64_t now_ms =
        std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    runtime::RuntimeEvent e;
    e.trace_id = "t";
    e.span_id = "s1";
    e.kind = "call";
    e.status = "ok";
    e.file_path = session::pyproj_small_path() + "/app/utils.py";
    e.line = 9;
    e.start_ns = now_ms * 1000000;
    e.duration_ns = 4000000;
    runtime::hub().ingest(*project, {e}, env.notifier, now_ms);

    const auto s = env.call("metrics.series", {{"project_id", pid},
                                                {"node_id", "module:app/utils.py"},
                                                {"metric", "calls"},
                                                {"from_ms", now_ms - 60000},
                                                {"to_ms", now_ms + 60000},
                                                {"bucket_ms", 60000}});
    double total = 0;
    for (const auto& p : s["points"]) total += p["v"].get<double>();
    EXPECT_EQ(total, 1);

    const std::string out = dir.db("ds.csv");
    const auto ex = env.call("metrics.export", {{"project_id", pid}, {"out_path", out}});
    EXPECT_EQ(ex["rows"], 1);
    EXPECT_EQ(ex["columns"].size(), 12u);
    EXPECT_THROW(env.call("metrics.export", {{"project_id", pid}, {"out_path", "relative.csv"}}), core::PvError);
    runtime::hub().reset_for_tests();
}
