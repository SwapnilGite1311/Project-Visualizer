#include <gtest/gtest.h>

#include "../../graph/tests/sample_graph.hpp"
#include "pv/deps/deps.hpp"

using namespace pv;
using graph::testing::make_edge;
using graph::testing::make_node;
using Ids = std::vector<std::string>;

namespace {

// Modules a, b, c, d each with one function; calls a→b, b→c, c→a and d→a.
graph::Graph cyclic_graph() {
    using core::EdgeKind;
    using core::NodeKind;
    graph::Graph g;
    g.add_node(make_node(NodeKind::Project, "project:", "", "", 0, 0));
    for (const std::string m : {"a", "b", "c", "d"}) {
        g.add_node(make_node(NodeKind::Module, "module:" + m + ".py", "project:", m + ".py", 1, 5));
        g.add_node(make_node(NodeKind::Function, "function:" + m + ".py#" + m, "module:" + m + ".py", m + ".py", 1, 5));
    }
    g.add_edge(make_edge(EdgeKind::Calls, "function:a.py#a", "function:b.py#b"));
    g.add_edge(make_edge(EdgeKind::Calls, "function:b.py#b", "function:c.py#c"));
    g.add_edge(make_edge(EdgeKind::Calls, "function:c.py#c", "function:a.py#a"));
    g.add_edge(make_edge(EdgeKind::Calls, "function:d.py#d", "function:a.py#a"));
    return g;
}

}  // namespace

TEST(DepsCycles, ModuleLevel) {
    const auto cycles = deps::find_cycles(cyclic_graph(), 2, 20);
    ASSERT_EQ(cycles.size(), 1u);
    EXPECT_EQ(cycles[0], (Ids{"module:a.py", "module:b.py", "module:c.py"}));
}

TEST(DepsCycles, FunctionLevel) {
    const auto cycles = deps::find_cycles(cyclic_graph(), 4, 20);
    ASSERT_EQ(cycles.size(), 1u);
    EXPECT_EQ(cycles[0], (Ids{"function:a.py#a", "function:b.py#b", "function:c.py#c"}));
}

TEST(DepsCycles, NoCycles) {
    EXPECT_TRUE(deps::find_cycles(graph::testing::sample_graph(), 2, 20).empty());
    EXPECT_TRUE(deps::find_cycles(graph::testing::sample_graph(), 4, 20).empty());
}
