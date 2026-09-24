#include <gtest/gtest.h>

#include <thread>

#include "pv/rpc/notifier.hpp"

using namespace pv::rpc;

TEST(RpcNotifier, RecordsFromTwoThreads) {
    RecordingNotifier notifier;
    std::thread a([&] { notifier.notify("a.one", Json{{"x", 1}}); });
    std::thread b([&] { notifier.notify("b.two", Json{{"y", 2}}); });
    a.join();
    b.join();
    EXPECT_EQ(notifier.items().size(), 2u);
    NullNotifier null;
    null.notify("ignored", Json::object());
}
