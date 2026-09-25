#include <gtest/gtest.h>

#include <iostream>
#include <map>

#include "pv/lang_csharp/csharp.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

TEST(LangCsharpGolden, FixtureGraph) {
    session::TestEnv env(std::make_unique<lang_csharp::CSharpAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(std::string(PV_TEST_FIXTURES) + "/csproj_small"));
    project->read([](const graph::Graph& g) {
        std::map<std::string, int> nodes, edges;
        for (const core::Node* n : g.all_nodes()) ++nodes[core::to_string(n->kind)];
        for (const core::Edge* e : g.all_edges()) ++edges[core::to_string(e->kind)];
        const std::map<std::string, int> want_nodes{{"project", 1}, {"package", 3}, {"module", 2},
                                                    {"class", 4},   {"method", 5},  {"external", 1}};
        const std::map<std::string, int> want_edges{{"imports", 2}, {"calls", 2}, {"inherits", 2}};
        if (nodes != want_nodes || edges != want_edges) {
            for (const core::Node* n : g.all_nodes()) std::cout << "node " << n->id << "\n";
            for (const core::Edge* e : g.all_edges()) std::cout << "edge " << e->id << "\n";
        }
        EXPECT_EQ(nodes, want_nodes);
        EXPECT_EQ(g.node_count(), 16u);
        EXPECT_EQ(edges, want_edges);
        EXPECT_NE(g.find_edge("imports|module:src/App/Program.cs|package:src/Util"), nullptr);
        EXPECT_NE(g.find_edge("imports|module:src/App/Program.cs|external:System"), nullptr);
        EXPECT_NE(g.find_edge("calls|method:src/App/Program.cs#Program.Main|method:src/App/Program.cs#Program.Run"), nullptr);
        EXPECT_NE(g.find_edge("calls|method:src/Util/Helper.cs#Helper.Greet|method:src/Util/Helper.cs#Helper.Format"), nullptr);
        EXPECT_NE(g.find_edge("inherits|class:src/Util/Helper.cs#Helper|class:src/Util/Helper.cs#IGreeter"), nullptr);
        EXPECT_EQ(g.node("method:src/App/Program.cs#Program.Run").metrics.complexity, 2);
    });
}
