#include "pv/core/error.hpp"
#include "pv/rpc/params.hpp"
#include "pv/runtime/hub.hpp"
#include "pv/session/registry.hpp"
#include "pv/sim/replay.hpp"
#include "pv/sim/sim.hpp"

void pv_register_sim(pv::session::Registry& reg) {
    using pv::rpc::Json;
    pv::session::ProjectManager& pm = reg.projects;

    reg.methods.add("sim.create", [&pm](const Json& p) {
        const auto& sb = pv::sim::sandboxes().create(pm, pv::rpc::require_string(p, "project_id"), pv::rpc::optional_string(p, "label", ""));
        return Json{{"sandbox_id", sb.id}, {"view_project_id", sb.view_project_id}};
    });

    reg.methods.add("sim.apply", [&pm](const Json& p) {
        pv::sim::Sandbox& sb = pv::sim::sandboxes().get(pv::rpc::require_string(p, "sandbox_id"));
        if (!p.contains("change")) throw pv::core::PvError(pv::core::err::InvalidParams, "missing change");
        const pv::sim::SimChange change = pv::sim::change_from_json(p["change"]);
        const auto view = pm.get_ready(sb.view_project_id);
        std::lock_guard<std::mutex> lock(pv::sim::sandboxes().mutex());
        const auto affected = view->write([&](pv::graph::Graph& g) { return pv::sim::apply_change(sb, g, change); });
        return Json{{"ok", true}, {"changes_count", static_cast<int>(sb.changes.size())}, {"affected", affected}};
    });

    reg.methods.add("sim.run", [&pm](const Json& p) {
        pv::sim::Sandbox& sb = pv::sim::sandboxes().get(pv::rpc::require_string(p, "sandbox_id"));
        int limit = 500;
        if (p.contains("scenario") && p["scenario"].is_object()) {
            limit = pv::rpc::clamp_int(pv::rpc::optional_int(p["scenario"], "trace_limit", 500), 10, 5000);
        }
        const auto view = pm.get_ready(sb.view_project_id);
        const auto events = pv::runtime::hub().events(sb.base_project_id);  // what really happened in the base project
        std::lock_guard<std::mutex> lock(pv::sim::sandboxes().mutex());
        return view->read([&](const pv::graph::Graph& g) {
            return events.empty() ? pv::sim::run_static(sb, g) : pv::sim::run_replay(sb, g, events, limit);
        });
    });

    reg.methods.add("sim.flows", [&pm](const Json& p) {
        pv::sim::Sandbox& sb = pv::sim::sandboxes().get(pv::rpc::require_string(p, "sandbox_id"));
        const auto view = pm.get_ready(sb.view_project_id);
        const auto events = pv::runtime::hub().events(sb.base_project_id);
        std::lock_guard<std::mutex> lock(pv::sim::sandboxes().mutex());
        return view->read([&](const pv::graph::Graph& g) {
            return pv::sim::sim_flows(sb, g, events, pv::rpc::optional_string(p, "parent_id", "project:"));
        });
    });

    reg.methods.add("sim.list", [&pm](const Json& p) {
        const std::string pid = pv::rpc::require_string(p, "project_id");
        pm.get(pid);
        Json list = Json::array();
        for (const pv::sim::Sandbox* sb : pv::sim::sandboxes().list(pid)) {
            list.push_back({{"sandbox_id", sb->id},
                            {"view_project_id", sb->view_project_id},
                            {"label", sb->label},
                            {"changes_count", static_cast<int>(sb->changes.size())},
                            {"created_ms", sb->created_ms}});
        }
        return Json{{"sandboxes", list}};
    });

    reg.methods.add("sim.discard", [&pm](const Json& p) {
        pv::sim::sandboxes().discard(pm, pv::rpc::require_string(p, "sandbox_id"));
        return Json{{"ok", true}};
    });
}
