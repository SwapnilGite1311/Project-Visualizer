#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/runtime/event.hpp"

using namespace pv;
using nlohmann::json;

namespace {

json valid() {
    return json{{"v", 1},
                {"event_id", "e1"},
                {"trace_id", "t1"},
                {"span_id", "s1"},
                {"parent_span_id", nullptr},
                {"kind", "call"},
                {"name", "app.users.get_user"},
                {"file_path", "C:/code/app/users.py"},
                {"line", 42},
                {"start_ns", 1790000000000000000LL},
                {"duration_ns", 1200000},
                {"status", "error"},
                {"error", {{"type", "ValueError"}, {"message", "bad id"}, {"stack", "Traceback ..."}}},
                {"attrs", {{"http.method", "GET"}, {"http.status_code", 200}}},
                {"service", "my-app"},
                {"pid", 1234},
                {"thread", "MainThread"}};
}

}  // namespace

TEST(RuntimeEvent, ParsesValidEvents) {
    const auto e = runtime::event_from_json(valid());
    EXPECT_EQ(e.span_id, "s1");
    EXPECT_EQ(e.parent_span_id, "");
    EXPECT_EQ(e.line, 42);
    EXPECT_EQ(e.start_ns, 1790000000000000000LL);
    ASSERT_TRUE(e.error.has_value());
    EXPECT_EQ(e.error->type, "ValueError");
    EXPECT_EQ(e.attrs["http.status_code"], 200);
    EXPECT_TRUE(runtime::is_error_event(e));

    json minimal{{"v", 1}, {"event_id", "e"}, {"trace_id", "t"}, {"span_id", "s"}, {"kind", "log"}, {"name", ""}, {"start_ns", 0}};
    const auto m = runtime::event_from_json(minimal);
    EXPECT_EQ(m.status, "ok");
    EXPECT_EQ(m.line, 0);
    EXPECT_FALSE(m.error.has_value());
    EXPECT_FALSE(runtime::is_error_event(m));
}

TEST(RuntimeEvent, RejectsBadEvents) {
    json missing = valid();
    missing.erase("span_id");
    EXPECT_THROW(runtime::event_from_json(missing), core::PvError);
    json kind = valid();
    kind["kind"] = "teleport";
    EXPECT_THROW(runtime::event_from_json(kind), core::PvError);
    json version = valid();
    version["v"] = 2;
    EXPECT_THROW(runtime::event_from_json(version), core::PvError);
    json negative = valid();
    negative["start_ns"] = -5;
    EXPECT_THROW(runtime::event_from_json(negative), core::PvError);
    EXPECT_THROW(runtime::event_from_json(json::array()), core::PvError);
}

TEST(RuntimeEvent, CutsLongTextAndRoundTrips) {
    json long_name = valid();
    long_name["name"] = std::string(5000, 'x');
    long_name["error"]["stack"] = std::string(20000, 's');
    const auto e = runtime::event_from_json(long_name);
    EXPECT_EQ(e.name.size(), 4096u);
    EXPECT_EQ(e.error->stack.size(), 16384u);

    const auto original = runtime::event_from_json(valid());
    const auto again = runtime::event_from_json(runtime::event_to_json(original));
    EXPECT_EQ(again.event_id, original.event_id);
    EXPECT_EQ(again.file_path, original.file_path);
    EXPECT_EQ(again.duration_ns, original.duration_ns);
    EXPECT_EQ(again.error->message, "bad id");
    EXPECT_EQ(again.attrs, original.attrs);
}
