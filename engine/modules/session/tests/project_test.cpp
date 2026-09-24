#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/session/project.hpp"

using namespace pv;
using namespace pv::session;

TEST(SessionProject, StateAndGraph) {
    Project p("p1", "C:/code/x");
    EXPECT_EQ(p.state(), ProjectState::Idle);
    try {
        p.require_ready();
        FAIL() << "expected NotReady";
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::NotReady);
    }
    p.set_state(ProjectState::Ready);
    EXPECT_NO_THROW(p.require_ready());

    graph::Graph g;
    core::Node n;
    n.id = "project:";
    n.kind = core::NodeKind::Project;
    g.add_node(n);
    p.replace_graph(std::move(g));
    EXPECT_EQ(p.read([](const graph::Graph& graph) { return graph.node_count(); }), 1u);

    p.set_error("x");
    EXPECT_EQ(p.state(), ProjectState::Error);
    EXPECT_EQ(p.error_message(), "x");
    EXPECT_EQ(to_string(ProjectState::Linking), "linking");
}
