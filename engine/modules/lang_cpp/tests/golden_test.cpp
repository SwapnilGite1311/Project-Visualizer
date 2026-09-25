#include <gtest/gtest.h>

#include <iostream>
#include <map>

#include "pv/lang_cpp/cpp.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

TEST(LangCppGolden, FixtureGraph) {
    session::TestEnv env(lang_cpp::make_cpp_adapter());
    env.adapters.add(lang_cpp::make_c_adapter());
    const auto project = env.projects->get_ready(env.open_and_wait(std::string(PV_TEST_FIXTURES) + "/cppproj_small"));
    project->read([](const graph::Graph& g) {
        std::map<std::string, int> nodes, edges;
        for (const core::Node* n : g.all_nodes()) ++nodes[core::to_string(n->kind)];
        for (const core::Edge* e : g.all_edges()) ++edges[core::to_string(e->kind)];
        const std::map<std::string, int> want_nodes{{"project", 1}, {"package", 1},  {"module", 5},  {"class", 3},
                                                    {"function", 4}, {"method", 1}, {"external", 1}};
        const std::map<std::string, int> want_edges{{"imports", 6}, {"calls", 1}, {"inherits", 1}};
        if (nodes != want_nodes || edges != want_edges) {
            for (const core::Node* n : g.all_nodes()) std::cout << "node " << n->id << "\n";
            for (const core::Edge* e : g.all_edges()) std::cout << "edge " << e->id << "\n";
        }
        EXPECT_EQ(nodes, want_nodes);
        EXPECT_EQ(g.node_count(), 16u);
        EXPECT_EQ(edges, want_edges);
        EXPECT_NE(g.find_node("class:src/util.h#Point"), nullptr);
        EXPECT_NE(g.find_node("function:src/util.h#twice"), nullptr);
        EXPECT_NE(g.find_node("function:src/util.c#add"), nullptr);
        EXPECT_NE(g.find_node("method:src/shape.hpp#Square.Square"), nullptr);
        EXPECT_NE(g.find_edge("calls|function:src/shape.cpp#Square.area|function:src/util.h#twice"), nullptr);
        EXPECT_NE(g.find_edge("inherits|class:src/shape.hpp#Square|class:src/shape.hpp#Shape"), nullptr);
        EXPECT_NE(g.find_edge("imports|module:src/main.cpp|external:iostream"), nullptr);
        EXPECT_NE(g.find_edge("imports|module:src/util.c|module:src/util.h"), nullptr);
        EXPECT_EQ(g.node("function:src/util.c#add").metrics.complexity, 2);
    });
}
