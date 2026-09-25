#include <gtest/gtest.h>

#include "runtime_fixture.hpp"

using namespace pv;
using runtime::testing::event;

TEST(RuntimeMapping, EventsBecomeNodes) {
    runtime::testing::Fixture f;
    const auto mapped = runtime::hub().map_events(*f.project, {
                                                                  event("a", f.root + "/app/utils.py", 9),
                                                                  event("b", f.root + "/app/utils.py", 1),
                                                                  event("c", "C:/elsewhere/x.py", 3),
                                                                  event("d", "app/services.py", 11),
                                                              });
    ASSERT_EQ(mapped.size(), 4u);
    EXPECT_EQ(mapped[0].node_id, "function:app/utils.py#is_valid");
    EXPECT_EQ(mapped[1].node_id, "module:app/utils.py");
    EXPECT_EQ(mapped[2].node_id, "");
    EXPECT_EQ(mapped[3].node_id, "method:app/services.py#UserService.get_user");
}

TEST(RuntimeMapping, ParentSpansGiveParentNodes) {
    runtime::testing::Fixture f;
    runtime::hub().map_events(*f.project, {event("root", f.root + "/app/services.py", 11)});
    const auto child = runtime::hub().map_events(*f.project, {event("child", f.root + "/app/utils.py", 9, "root")});
    EXPECT_EQ(child[0].node_id, "function:app/utils.py#is_valid");
    EXPECT_EQ(child[0].parent_node_id, "method:app/services.py#UserService.get_user");
    const auto orphan = runtime::hub().map_events(*f.project, {event("x", f.root + "/app/utils.py", 9, "unknown-span")});
    EXPECT_EQ(orphan[0].parent_node_id, "");
}
