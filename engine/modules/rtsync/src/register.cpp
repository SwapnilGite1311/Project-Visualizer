#include <chrono>

#include "pv/rpc/params.hpp"
#include "pv/rtsync/rtsync.hpp"
#include "pv/session/registry.hpp"

void pv_register_rtsync(pv::session::Registry& reg) {
    using pv::rpc::Json;
    pv::session::ProjectManager& pm = reg.projects;

    reg.methods.add("rtsync.level_view", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string parent = pv::rpc::optional_string(p, "parent_id", "project:");
        const int window_ms = pv::rpc::clamp_int(pv::rpc::optional_int(p, "window_ms", 5000), 1000, 600000);
        const int64_t now_ms =
            std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();
        const auto events = pv::runtime::hub().events(project->id());
        return project->read([&](const pv::graph::Graph& g) {
            const auto health = pv::health::tracker().evaluate(project->id(), g, now_ms);
            return pv::rtsync::live_level_view(g, parent, events, health, static_cast<int64_t>(window_ms) * 1000000);
        });
    });
}
