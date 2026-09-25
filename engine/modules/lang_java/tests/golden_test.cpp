#include <gtest/gtest.h>

#include <iostream>
#include <map>

#include "pv/lang_java/java.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

TEST(LangJavaGolden, FixtureGraph) {
    session::TestEnv env(std::make_unique<lang_java::JavaAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(std::string(PV_TEST_FIXTURES) + "/javaproj_small"));
    project->read([](const graph::Graph& g) {
        std::map<std::string, int> nodes, edges;
        for (const core::Node* n : g.all_nodes()) ++nodes[core::to_string(n->kind)];
        for (const core::Edge* e : g.all_edges()) ++edges[core::to_string(e->kind)];
        const std::map<std::string, int> want_nodes{{"project", 1}, {"package", 8}, {"module", 5},  {"class", 5},
                                                    {"method", 6},  {"external", 1}};
        const std::map<std::string, int> want_edges{{"imports", 4}, {"calls", 3}, {"inherits", 2}};
        if (nodes != want_nodes || edges != want_edges) {
            for (const core::Node* n : g.all_nodes()) std::cout << "node " << n->id << "\n";
            for (const core::Edge* e : g.all_edges()) std::cout << "edge " << e->id << "\n";
        }
        EXPECT_EQ(nodes, want_nodes);
        EXPECT_EQ(g.node_count(), 26u);
        EXPECT_EQ(edges, want_edges);
        const std::string app = "method:src/main/java/com/acme/App.java#App.main";
        const std::string helper = "src/main/java/com/acme/util/Helper.java";
        EXPECT_NE(g.find_edge("calls|" + app + "|class:" + helper + "#Helper"), nullptr);
        EXPECT_NE(g.find_edge("calls|" + app + "|method:" + helper + "#Helper.version"), nullptr);
        EXPECT_NE(g.find_edge("calls|method:" + helper + "#Helper.greet|method:" + helper + "#Helper.format"), nullptr);
    });
}
