#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/core/ids.hpp"

using namespace pv::core;

TEST(CoreIds, NodeIds) {
    EXPECT_EQ(make_node_id(NodeKind::Project, "x", "y"), "project:");
    EXPECT_EQ(make_node_id(NodeKind::Package, "src/app", ""), "package:src/app");
    EXPECT_EQ(make_node_id(NodeKind::Module, "src/app/main.py", ""), "module:src/app/main.py");
    EXPECT_EQ(make_node_id(NodeKind::Method, "src/app/main.py", "App.start"), "method:src/app/main.py#App.start");
    EXPECT_EQ(make_node_id(NodeKind::External, "", "numpy"), "external:numpy");
}

TEST(CoreIds, StatementIds) {
    EXPECT_EQ(make_statement_id("a.py", "run", 5), "statement:a.py#run@5");
    EXPECT_THROW(make_node_id(NodeKind::Statement, "a.py", "run"), PvError);
}

TEST(CoreIds, KindOfNodeId) {
    EXPECT_EQ(kind_of_node_id("class:a.py#A"), NodeKind::Class);
    EXPECT_FALSE(kind_of_node_id("nothing").has_value());
}
