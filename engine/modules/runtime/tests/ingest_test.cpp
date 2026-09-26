#include <gtest/gtest.h>

#include "runtime_fixture.hpp"

using namespace pv;
using runtime::testing::event;

TEST(RuntimeIngest, WindowsListenersAndCounters) {
    runtime::testing::Fixture f;
    rpc::RecordingNotifier notifier;
    std::vector<std::size_t> batches;
    runtime::hub().add_listener([&](const std::string& pid, const std::vector<runtime::MappedEvent>& batch) {
        EXPECT_EQ(pid, f.project->id());
        batches.push_back(batch.size());
    });

    auto err = event("c", f.root + "/app/utils.py", 9, "b");
    err.status = "error";
    err.error = runtime::EventError{"ValueError", "bad id", ""};
    // Ordinary calls wait for the 250 ms window.
    const auto first = runtime::hub().ingest(*f.project, {event("a", f.root + "/main.py", 8), event("b", f.root + "/app/services.py", 11, "a")},
                                             notifier, 1000);
    EXPECT_EQ(first.accepted, 2);
    EXPECT_EQ(first.mapped, 2);
    EXPECT_EQ(first.dropped, 0);
    EXPECT_TRUE(notifier.items().empty());

    // An error is sent at once, with the rest of its window (a crash may be the last thing a program sends).
    runtime::hub().ingest(*f.project, {err}, notifier, 1050);
    auto items = notifier.items();
    ASSERT_EQ(items.size(), 1u);
    EXPECT_EQ(items[0].first, "runtime.update");
    const auto& u = items[0].second;
    EXPECT_EQ(u["node_hits"]["method:app/services.py#UserService.get_user"], 1);
    EXPECT_EQ(u["node_hits"]["function:app/utils.py#is_valid"], 1);
    EXPECT_EQ(u["edge_flows"]["function:main.py#main|method:app/services.py#UserService.get_user"], 1);
    EXPECT_EQ(u["edge_flows"]["method:app/services.py#UserService.get_user|function:app/utils.py#is_valid"], 1);
    ASSERT_EQ(u["errors"].size(), 1u);
    EXPECT_EQ(u["errors"][0]["type"], "ValueError");
    EXPECT_TRUE(u["stalls"].empty());
    EXPECT_EQ(u["window_start_ns"], 100);

    // So is a hang.
    auto stall = event("d", f.root + "/app/utils.py", 5, "", "t2", 500, 7000);
    stall.kind = "stall";
    runtime::hub().ingest(*f.project, {stall}, notifier, 1100);
    items = notifier.items();
    ASSERT_EQ(items.size(), 2u);
    EXPECT_EQ(items[1].second["node_hits"]["function:app/utils.py#normalize"], 1);
    ASSERT_EQ(items[1].second["stalls"].size(), 1u);
    EXPECT_EQ(items[1].second["stalls"][0]["duration_ns"], 7000);
    EXPECT_EQ(items[1].second["window_end_ns"], 7500);
    EXPECT_EQ(batches, (std::vector<std::size_t>{2, 1, 1}));

    const auto status = runtime::hub().status(f.project->id(), 1400);
    EXPECT_TRUE(status.active);
    EXPECT_EQ(status.events_total, 4);
    EXPECT_FALSE(runtime::hub().status(f.project->id(), 20000).active);
}

TEST(RuntimeIngest, RingBufferAndClear) {
    runtime::testing::Fixture f;
    rpc::NullNotifier notifier;
    std::vector<runtime::RuntimeEvent> events;
    events.reserve(50001);
    for (int i = 0; i < 50001; ++i) events.push_back(event("s" + std::to_string(i), "", 0));
    const auto r = runtime::hub().ingest(*f.project, events, notifier, 1000);
    EXPECT_EQ(r.dropped, 1);
    EXPECT_EQ(r.mapped, 0);
    const auto status = runtime::hub().status(f.project->id(), 1000);
    EXPECT_EQ(status.events_buffered, 50000);
    EXPECT_EQ(status.events_total, 50001);
    EXPECT_EQ(runtime::hub().events(f.project->id()).front().ev.span_id, "s1");
    runtime::hub().clear(f.project->id());
    EXPECT_EQ(runtime::hub().status(f.project->id(), 1000).events_buffered, 0);
}

// Agents report a span when it ends, so a child usually arrives before its parent (same batch or an earlier one).
TEST(RuntimeIngest, ChildrenBeforeTheirParent) {
    runtime::testing::Fixture f;
    rpc::RecordingNotifier notifier;
    const std::string services = "method:app/services.py#UserService.get_user";
    const std::string valid = "function:app/utils.py#is_valid";
    runtime::hub().ingest(*f.project, {event("c1", f.root + "/app/utils.py", 9, "p")}, notifier, 1000);  // parent not seen yet
    runtime::hub().ingest(*f.project, {event("c2", f.root + "/app/utils.py", 9, "p"), event("p", f.root + "/app/services.py", 11)},
                          notifier, 1100);
    const auto events = runtime::hub().events(f.project->id());
    ASSERT_EQ(events.size(), 3u);
    EXPECT_EQ(events[0].parent_node_id, services);  // linked when the parent arrived
    EXPECT_EQ(events[1].parent_node_id, services);
    EXPECT_EQ(events[2].parent_node_id, "");

    runtime::hub().ingest(*f.project, {}, notifier, 1300);
    ASSERT_EQ(notifier.items().size(), 1u);
    EXPECT_EQ(notifier.items()[0].second["edge_flows"][services + "|" + valid], 2);
}
