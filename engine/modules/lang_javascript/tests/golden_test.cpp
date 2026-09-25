#include <gtest/gtest.h>

#include <iostream>
#include <map>

#include "pv/lang_javascript/adapters.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

TEST(LangJsGolden, FixtureGraph) {
    session::TestEnv env(lang_javascript::make_javascript_adapter());
    env.adapters.add(lang_javascript::make_typescript_adapter());
    env.adapters.add(lang_javascript::make_tsx_adapter());
    const std::string root = std::string(PV_TEST_FIXTURES) + "/jsproj_small";
    const auto project = env.projects->get_ready(env.open_and_wait(root));

    project->read([](const graph::Graph& g) {
        std::map<std::string, int> nodes, edges;
        for (const core::Node* n : g.all_nodes()) ++nodes[core::to_string(n->kind)];
        for (const core::Edge* e : g.all_edges()) ++edges[core::to_string(e->kind)];
        const std::map<std::string, int> want_nodes{{"project", 1}, {"package", 3},  {"module", 5},  {"class", 4},
                                                    {"method", 2},  {"function", 5}, {"external", 1}};
        const std::map<std::string, int> want_edges{{"imports", 5}, {"calls", 8}, {"inherits", 2}};
        if (nodes != want_nodes || edges != want_edges) {
            for (const core::Node* n : g.all_nodes()) std::cout << "node " << n->id << "\n";
            for (const core::Edge* e : g.all_edges()) std::cout << "edge " << e->id << "\n";
        }
        EXPECT_EQ(nodes, want_nodes);
        EXPECT_EQ(g.node_count(), 21u);
        EXPECT_EQ(edges, want_edges);
        EXPECT_NE(g.find_edge("calls|method:src/api/client.ts#ApiClient.fetchUser|method:src/api/client.ts#ApiClient.request"), nullptr);
        EXPECT_NE(g.find_edge("calls|function:src/index.js#main|function:src/utils/index.js#log"), nullptr);
        EXPECT_NE(g.find_edge("inherits|class:src/api/models.ts#User|class:src/api/models.ts#BaseModel"), nullptr);
    });
}
