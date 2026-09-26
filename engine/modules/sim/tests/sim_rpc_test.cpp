#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "sim_fixture.hpp"

void pv_register_sim(pv::session::Registry& reg);

using namespace pv;
using namespace pv::sim::testing;

namespace {

runtime::RuntimeEvent raw(const std::string& span, const std::string& file, int line, const std::string& parent, int64_t ms) {
    runtime::RuntimeEvent e;
    e.event_id = "e-" + span;
    e.trace_id = "trace-" + span.substr(0, 1);
    e.span_id = span;
    e.parent_span_id = parent;
    e.kind = "call";
    e.status = "ok";
    e.file_path = file;
    e.line = line;
    e.start_ns = 1000;
    e.duration_ns = ms * 1000000;
    return e;
}

}  // namespace

TEST(SimRpc, CreateApplyRunDiscard) {
    Fixture f;
    pv_register_sim(*f.env.reg);
    const auto created = f.env.call("sim.create", {{"project_id", f.pid}, {"label", "no validation"}});
    const std::string sb = created["sandbox_id"];

    // No recorded traces yet: static answer.
    f.env.call("sim.apply", {{"sandbox_id", sb}, {"change", {{"kind", "delete_node"}, {"node_id", kIsValid}}}});
    const auto st = f.env.call("sim.run", {{"sandbox_id", sb}});
    EXPECT_EQ(st["mode"], "static");

    // Record a real trace in the base project, then replay it.
    const std::string root = session::pyproj_small_path();
    const auto project = f.env.projects->get(f.pid);
    runtime::hub().ingest(*project, {raw("a1", root + "/app/services.py", 11, "", 10), raw("a2", root + "/app/utils.py", 9, "a1", 2)},
                          f.env.notifier, 1000);
    const auto run = f.env.call("sim.run", {{"sandbox_id", sb}, {"scenario", {{"trace_limit", 50}}}});
    EXPECT_EQ(run["mode"], "replay");
    EXPECT_EQ(run["traces_total"], 1);
    EXPECT_EQ(run["traces_failed_sim"], 1);

    const auto flows = f.env.call("sim.flows", {{"sandbox_id", sb}, {"parent_id", "package:app"}});
    ASSERT_EQ(flows["flows"].size(), 1u);
    EXPECT_EQ(flows["flows"][0]["failed"], 1);

    const auto list = f.env.call("sim.list", {{"project_id", f.pid}});
    ASSERT_EQ(list["sandboxes"].size(), 1u);
    EXPECT_EQ(list["sandboxes"][0]["changes_count"], 1);
    EXPECT_EQ(list["sandboxes"][0]["label"], "no validation");

    EXPECT_EQ(f.env.call("sim.discard", {{"sandbox_id", sb}})["ok"], true);
    EXPECT_THROW(f.env.projects->get(created["view_project_id"]), core::PvError);
    EXPECT_THROW(f.env.call("sim.run", {{"sandbox_id", sb}}), core::PvError);
}
