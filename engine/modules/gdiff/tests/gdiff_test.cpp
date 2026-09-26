#include <gtest/gtest.h>

#include "../../graph/tests/sample_graph.hpp"
#include "pv/gdiff/gdiff.hpp"

using namespace pv;

namespace {

// A copy of `g` without one node (and without its edges).
graph::Graph without(const graph::Graph& g, const std::string& drop) {
    graph::Graph out;
    for (const core::Node* n : g.all_nodes()) {
        if (n->id != drop) out.add_node(*n);
    }
    for (const core::Edge* e : g.all_edges()) {
        if (e->source_id != drop && e->target_id != drop) out.add_edge(*e);
    }
    return out;
}

}  // namespace

TEST(GdiffCompare, RemovedChangedAndPackages) {
    const graph::Graph base = graph::testing::sample_graph();
    graph::Graph head = without(base, "function:app/a.py#f");
    head.find_node_mut("method:app/a.py#C.m")->metrics.complexity = 7;
    head.find_node_mut("module:main.py")->span = core::Span{5, 0, 14, 0};  // moved down, same size: not a change

    const auto d = gdiff::compare_graphs(base, head);
    EXPECT_EQ(d["removed"], nlohmann::json::array({"function:app/a.py#f"}));
    EXPECT_TRUE(d["added"].empty());
    ASSERT_EQ(d["changed"].size(), 1u);
    EXPECT_EQ(d["changed"][0]["node_id"], "method:app/a.py#C.m");
    EXPECT_EQ(d["changed"][0]["fields"], nlohmann::json::array({"metrics.complexity"}));
    EXPECT_EQ(d["edges_removed"], 2);  // main->f and f->C.m
    EXPECT_EQ(d["edges_added"], 0);
    ASSERT_EQ(d["packages"].size(), 1u);
    EXPECT_EQ(d["packages"][0]["node_id"], "package:app");
    EXPECT_EQ(d["packages"][0]["removed"], 1);
    EXPECT_EQ(d["packages"][0]["changed"], 1);
}

TEST(GdiffCompare, AddedAndIdentical) {
    const graph::Graph small = without(graph::testing::sample_graph(), "external:os");
    const graph::Graph full = graph::testing::sample_graph();
    const auto d = gdiff::compare_graphs(small, full);
    EXPECT_EQ(d["added"], nlohmann::json::array({"external:os"}));
    EXPECT_EQ(d["edges_added"], 1);
    const auto same = gdiff::compare_graphs(full, full);
    EXPECT_TRUE(same["added"].empty() && same["removed"].empty() && same["changed"].empty());
}
