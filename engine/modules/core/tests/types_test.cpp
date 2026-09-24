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

TEST(CoreTypes, ToString) {
    EXPECT_EQ(to_string(NodeKind::Method), "method");
    EXPECT_EQ(to_string(EdgeKind::Inherits), "inherits");
    EXPECT_EQ(to_string(Health::Stalled), "stalled");
}

TEST(CoreTypes, FromString) {
    EXPECT_EQ(node_kind_from_string("external"), NodeKind::External);
    EXPECT_FALSE(node_kind_from_string("Class").has_value());
    EXPECT_EQ(edge_kind_from_string("calls"), EdgeKind::Calls);
    EXPECT_EQ(health_from_string("error"), Health::Error);
}

TEST(CoreTypes, NodeKindRoundTrip) {
    for (NodeKind k : {NodeKind::Project, NodeKind::Package, NodeKind::Module, NodeKind::Class, NodeKind::Function,
                       NodeKind::Method, NodeKind::Variable, NodeKind::Statement, NodeKind::External}) {
        EXPECT_EQ(node_kind_from_string(to_string(k)), k);
    }
}

TEST(CoreTypes, Levels) {
    EXPECT_EQ(level_of(NodeKind::Class), 3);
    EXPECT_EQ(level_of(NodeKind::External), 1);
    EXPECT_EQ(level_of(NodeKind::Method), 4);
}

TEST(CoreTypes, HealthSeverity) {
    EXPECT_EQ(severity(Health::Error), 4);
    EXPECT_EQ(worst(Health::Ok, Health::Warning), Health::Warning);
    EXPECT_EQ(worst(Health::Error, Health::Stalled), Health::Error);
}
