#include <gtest/gtest.h>

#include <algorithm>

#include "pv/core/error.hpp"
#include "sample_graph.hpp"

using namespace pv;
using namespace pv::graph;
using core::EdgeKind;
using core::NodeKind;

namespace {

std::vector<std::string> ids_of(const std::vector<const core::Node*>& nodes) {
    std::vector<std::string> out;
    for (const core::Node* n : nodes) out.push_back(n->id);
    return out;
}

}  // namespace

TEST(GraphStore, AddAndFindNodes) {
    Graph g;
    EXPECT_TRUE(g.add_node(testing::make_node(NodeKind::Project, "project:", "", "", 0, 0)));
    EXPECT_FALSE(g.add_node(testing::make_node(NodeKind::Project, "project:", "", "", 0, 0)));
    EXPECT_TRUE(g.add_node(testing::make_node(NodeKind::Module, "module:a.py", "project:", "a.py", 1, 5)));
    EXPECT_TRUE(g.add_node(testing::make_node(NodeKind::Function, "function:a.py#f", "module:a.py", "a.py", 2, 3)));
    EXPECT_EQ(g.node_count(), 3u);
    EXPECT_EQ(g.find_node("x"), nullptr);
    EXPECT_THROW(g.node("x"), core::PvError);
    g.find_node_mut("function:a.py#f")->name = "renamed";
    EXPECT_EQ(g.node("function:a.py#f").name, "renamed");
}

TEST(GraphStore, Edges) {
    Graph g = testing::sample_graph();
    EXPECT_EQ(g.node_count(), 9u);
    EXPECT_EQ(g.edge_count(), 5u);
    EXPECT_EQ(g.out_edges("function:main.py#main").size(), 2u);
    EXPECT_EQ(g.in_edges("method:app/a.py#C.m").size(), 2u);
    g.add_edge(testing::make_edge(EdgeKind::Calls, "function:main.py#main", "function:app/a.py#f", 3));
    EXPECT_EQ(g.edge_count(), 5u);
    EXPECT_EQ(g.find_edge(core::make_edge_id(EdgeKind::Calls, "function:main.py#main", "function:app/a.py#f"))->weight, 4);
}

TEST(GraphStore, Children) {
    Graph g = testing::sample_graph();
    EXPECT_EQ(ids_of(g.children("project:")),
              (std::vector<std::string>{"package:app", "module:main.py", "external:os"}));
    EXPECT_EQ(ids_of(g.children("class:app/a.py#C")), (std::vector<std::string>{"method:app/a.py#C.m"}));
    EXPECT_TRUE(g.children("function:app/a.py#f").empty());
}

TEST(GraphStore, Listings) {
    Graph g = testing::sample_graph();
    EXPECT_EQ(g.nodes_in_file("app/a.py").size(), 4u);
    EXPECT_EQ(g.all_nodes().front()->id, "class:app/a.py#C");
    const auto edges = g.all_edges();
    EXPECT_EQ(edges.size(), 5u);
    EXPECT_TRUE(std::is_sorted(edges.begin(), edges.end(),
                               [](const core::Edge* a, const core::Edge* b) { return a->id < b->id; }));
}

TEST(GraphStore, AncestorsAndDescendants) {
    Graph g = testing::sample_graph();
    EXPECT_EQ(g.ancestors("method:app/a.py#C.m"),
              (std::vector<std::string>{"project:", "package:app", "module:app/a.py", "class:app/a.py#C",
                                        "method:app/a.py#C.m"}));
    EXPECT_EQ(g.ancestor_at_level("method:app/a.py#C.m", 2), "module:app/a.py");
    EXPECT_EQ(g.ancestor_at_level("function:main.py#main", 1), "project:");
    EXPECT_TRUE(g.is_descendant("function:app/a.py#f", "package:app"));
    EXPECT_FALSE(g.is_descendant("function:main.py#main", "package:app"));
    EXPECT_EQ(g.descendants("module:app/a.py"),
              (std::vector<std::string>{"function:app/a.py#f", "class:app/a.py#C", "method:app/a.py#C.m"}));
}

TEST(GraphStore, RemoveFile) {
    Graph g = testing::sample_graph();
    EXPECT_EQ(g.remove_file("app/a.py"), 4u);
    EXPECT_EQ(g.node_count(), 5u);
    EXPECT_EQ(g.edge_count(), 0u);
    EXPECT_TRUE(g.children("package:app").empty());
    EXPECT_TRUE(g.out_edges("function:main.py#main").empty());
    EXPECT_EQ(g.remove_file("unknown.py"), 0u);
}

TEST(GraphStore, InnermostAt) {
    Graph g = testing::sample_graph();
    EXPECT_EQ(g.innermost_at("app/a.py", 9)->id, "method:app/a.py#C.m");
    EXPECT_EQ(g.innermost_at("app/a.py", 3)->id, "function:app/a.py#f");
    EXPECT_EQ(g.innermost_at("app/a.py", 6)->id, "module:app/a.py");
    EXPECT_EQ(g.innermost_at("app/a.py", 15)->id, "class:app/a.py#C");
    EXPECT_EQ(g.innermost_at("missing.py", 1), nullptr);
}
