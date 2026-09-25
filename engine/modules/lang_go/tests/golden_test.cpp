#include <gtest/gtest.h>

#include <iostream>
#include <map>

#include "pv/lang_go/go.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

TEST(LangGoGolden, FixtureGraph) {
    session::TestEnv env(std::make_unique<lang_go::GoAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(std::string(PV_TEST_FIXTURES) + "/goproj_small"));
    project->read([](const graph::Graph& g) {
        std::map<std::string, int> nodes, edges;
        for (const core::Node* n : g.all_nodes()) ++nodes[core::to_string(n->kind)];
        for (const core::Edge* e : g.all_edges()) ++edges[core::to_string(e->kind)];
        const std::map<std::string, int> want_nodes{{"project", 1}, {"package", 2},  {"module", 3},  {"class", 2},
                                                    {"function", 3}, {"method", 1}, {"external", 1}};
        const std::map<std::string, int> want_edges{{"imports", 2}, {"calls", 3}};
        if (nodes != want_nodes || edges != want_edges) {
            for (const core::Node* n : g.all_nodes()) std::cout << "node " << n->id << "\n";
            for (const core::Edge* e : g.all_edges()) std::cout << "edge " << e->id << "\n";
        }
        EXPECT_EQ(nodes, want_nodes);
        EXPECT_EQ(g.node_count(), 13u);
        EXPECT_EQ(edges, want_edges);
        EXPECT_NE(g.find_edge("imports|module:main.go|external:fmt"), nullptr);
        EXPECT_NE(g.find_edge("imports|module:main.go|package:internal/store"), nullptr);
        EXPECT_NE(g.find_edge("calls|function:main.go#main|function:main.go#run"), nullptr);
        EXPECT_NE(g.find_edge("calls|function:main.go#run|external:fmt"), nullptr);
        EXPECT_EQ(g.node("method:internal/store/store.go#Store.Count").metrics.complexity, 2);
    });
}
