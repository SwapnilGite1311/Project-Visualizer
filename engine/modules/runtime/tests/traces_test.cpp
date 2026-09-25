#include <gtest/gtest.h>

#include "runtime_fixture.hpp"

using namespace pv;
using runtime::testing::event;

TEST(RuntimeTraces, SummariesAndSteps) {
    runtime::testing::Fixture f;
    rpc::NullNotifier notifier;
    const std::string utils = f.root + "/app/utils.py";
    auto failing = event("t1c", utils, 9, "t1b", "t1", 130, 5);
    failing.status = "error";
    runtime::hub().ingest(*f.project,
                          {
                              event("t1b", utils, 5, "t1a", "t1", 120, 20),
                              event("t1a", f.root + "/main.py", 8, "", "t1", 100, 100),
                              failing,
                              event("t2a", f.root + "/main.py", 8, "", "t2", 1000, 50),
                              event("t2b", utils, 9, "t2a", "t2", 1010, 10),
                          },
                          notifier, 1000);

    const auto traces = runtime::hub().recent_traces(f.project->id(), 20);
    ASSERT_EQ(traces.size(), 2u);
    EXPECT_EQ(traces[0].trace_id, "t2");  // newest first
    EXPECT_EQ(traces[0].spans, 2);
    EXPECT_EQ(traces[0].duration_ns, 50);
    EXPECT_EQ(traces[1].trace_id, "t1");
    EXPECT_EQ(traces[1].root_name, "fn-t1a");
    EXPECT_EQ(traces[1].start_ns, 100);
    EXPECT_EQ(traces[1].duration_ns, 100);
    EXPECT_EQ(traces[1].spans, 3);
    EXPECT_EQ(traces[1].errors, 1);
    EXPECT_EQ(runtime::hub().recent_traces(f.project->id(), 1).size(), 1u);

    const auto steps = runtime::hub().trace(f.project->id(), "t1");
    ASSERT_EQ(steps.size(), 3u);
    EXPECT_EQ(steps[0].ev.span_id, "t1a");
    EXPECT_EQ(steps[1].ev.span_id, "t1b");
    EXPECT_EQ(steps[2].ev.span_id, "t1c");
    EXPECT_EQ(steps[2].node_id, "function:app/utils.py#is_valid");
    EXPECT_TRUE(runtime::hub().trace(f.project->id(), "missing").empty());
}
