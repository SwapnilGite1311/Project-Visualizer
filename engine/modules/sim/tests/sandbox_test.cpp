#include <gtest/gtest.h>

#include <algorithm>

#include "pv/core/error.hpp"
#include "sim_fixture.hpp"

using namespace pv;
using namespace pv::sim;
using namespace pv::sim::testing;

TEST(SimSandbox, CreateAndRecordChanges) {
    Fixture f;
    Sandbox& sb = sandboxes().create(*f.env.projects, f.pid, "try");
    EXPECT_EQ(sb.id, "s1");
    const auto view = f.env.projects->get_ready(sb.view_project_id);
    EXPECT_NE(sb.view_project_id, f.pid);

    const auto affected = view->write([&](graph::Graph& g) { return apply_change(sb, g, change_from_json({{"kind", "delete_node"}, {"node_id", kIsValid}})); });
    EXPECT_NE(std::find(affected.begin(), affected.end(), kGetUser), affected.end());
    EXPECT_TRUE(sb.deleted_nodes.count(kIsValid));

    view->write([&](graph::Graph& g) {
        return apply_change(sb, g, change_from_json({{"kind", "set_latency"}, {"node_id", kGetUser}, {"factor", 3}}));
    });
    EXPECT_DOUBLE_EQ(sb.latency_factor.at(kGetUser), 3);
    EXPECT_EQ(sb.changes.size(), 2u);

    // add_edge changes the sandbox's copy only.
    view->write([&](graph::Graph& g) {
        return apply_change(sb, g, change_from_json({{"kind", "add_edge"}, {"source_id", kIsValid}, {"target_id", kGetUser}}));
    });
    EXPECT_TRUE(view->read([](const graph::Graph& g) { return g.find_edge("calls|" + kIsValid + "|" + kGetUser) != nullptr; }));
    EXPECT_FALSE(f.env.projects->get(f.pid)->read([](const graph::Graph& g) { return g.find_edge("calls|" + kIsValid + "|" + kGetUser) != nullptr; }));

    EXPECT_THROW(change_from_json({{"kind", "explode"}}), core::PvError);
    EXPECT_THROW(view->write([&](graph::Graph& g) { return apply_change(sb, g, change_from_json({{"kind", "delete_node"}, {"node_id", "nope"}})); }),
                 core::PvError);
    EXPECT_EQ(sandboxes().list(f.pid).size(), 1u);
    sandboxes().discard(*f.env.projects, sb.id);
    EXPECT_TRUE(sandboxes().list(f.pid).empty());
}
