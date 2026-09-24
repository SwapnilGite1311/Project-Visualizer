#include <gtest/gtest.h>

#include "pv/core/types.hpp"

using namespace pv::core;

TEST(CoreTypes, Defaults) {
    Node node;
    EXPECT_EQ(node.kind, NodeKind::Module);
    EXPECT_EQ(node.health, Health::Unknown);
    EXPECT_EQ(node.span.start_line, 0);
    EXPECT_EQ(node.metrics.loc, 0);

    Edge edge;
    EXPECT_EQ(edge.weight, 1);
    EXPECT_TRUE(edge.resolved);
}
