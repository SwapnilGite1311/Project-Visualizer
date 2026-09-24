#include <gtest/gtest.h>

#include <map>

#include "fixture_util.hpp"

using namespace pv;
using namespace pv::builder;

TEST(BuilderGolden, FixtureGraphShape) {
    parse::AdapterRegistry adapters;
    adapters.add(std::make_unique<lang_python::PythonAdapter>());
    const BuildResult r = build_project(adapters, pv::builder::testing::fixture_root(),
                                        pv::builder::testing::fixture_files(), nullptr, nullptr, 2);
    std::map<std::string, int> nodes;
    for (const core::Node* n : r.graph.all_nodes()) ++nodes[core::to_string(n->kind)];
    EXPECT_EQ(nodes["project"], 1);
    EXPECT_EQ(nodes["package"], 2);
    EXPECT_EQ(nodes["module"], 8);
    EXPECT_EQ(nodes["class"], 3);
    EXPECT_EQ(nodes["method"], 5);
    EXPECT_EQ(nodes["function"], 5);
    EXPECT_EQ(nodes["external"], 1);
    EXPECT_EQ(r.graph.node_count(), 25u);

    std::map<std::string, int> edges;
    for (const core::Edge* e : r.graph.all_edges()) ++edges[core::to_string(e->kind)];
    EXPECT_EQ(edges["imports"], 8);
    EXPECT_EQ(edges["calls"], 10);
    EXPECT_EQ(edges["inherits"], 1);
    EXPECT_EQ(r.graph.edge_count(), 19u);

    for (const char* id : {"function:broken.py#ok_function", "method:app/models.py#Base.save", "external:sys",
                           "package:app/api"}) {
        EXPECT_NE(r.graph.find_node(id), nullptr) << id;
    }
}
