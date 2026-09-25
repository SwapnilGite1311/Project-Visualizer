#include <gtest/gtest.h>

#include <iostream>
#include <map>

#include "pv/lang_rust/rust.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

TEST(LangRustGolden, FixtureGraph) {
    session::TestEnv env(std::make_unique<lang_rust::RustAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(std::string(PV_TEST_FIXTURES) + "/rustproj_small"));
    project->read([](const graph::Graph& g) {
        std::map<std::string, int> nodes, edges;
        for (const core::Node* n : g.all_nodes()) ++nodes[core::to_string(n->kind)];
        for (const core::Edge* e : g.all_edges()) ++edges[core::to_string(e->kind)];
        const std::map<std::string, int> want_nodes{{"project", 1}, {"package", 1},  {"module", 2},  {"class", 2},
                                                    {"method", 3},  {"function", 2}, {"external", 1}};
        const std::map<std::string, int> want_edges{{"imports", 3}, {"calls", 3}, {"inherits", 1}};
        if (nodes != want_nodes || edges != want_edges) {
            for (const core::Node* n : g.all_nodes()) std::cout << "node " << n->id << "\n";
            for (const core::Edge* e : g.all_edges()) std::cout << "edge " << e->id << "\n";
        }
        EXPECT_EQ(nodes, want_nodes);
        EXPECT_EQ(g.node_count(), 12u);
        EXPECT_EQ(edges, want_edges);
        EXPECT_NE(g.find_edge("calls|function:src/main.rs#main|method:src/store.rs#Store.new"), nullptr);
        EXPECT_NE(g.find_edge("calls|function:src/main.rs#main|function:src/main.rs#helper"), nullptr);
        EXPECT_NE(g.find_edge("calls|function:src/main.rs#main|external:std"), nullptr);
        EXPECT_NE(g.find_edge("inherits|class:src/store.rs#Store|class:src/store.rs#Countable"), nullptr);
        EXPECT_NE(g.find_edge("imports|module:src/main.rs|module:src/store.rs"), nullptr);
        EXPECT_NE(g.find_edge("imports|module:src/main.rs|class:src/store.rs#Store"), nullptr);
        EXPECT_EQ(g.node("method:src/store.rs#Store.add").metrics.complexity, 2);
    });
}
