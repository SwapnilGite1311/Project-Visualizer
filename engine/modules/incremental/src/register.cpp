#include <algorithm>

#include "pv/incremental/incremental.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

void pv_register_incremental(pv::session::Registry& reg) {
    // Watcher threads use the adapters and the notifier: stop them before the engine shuts down.
    reg.request_shutdown = [previous = reg.request_shutdown] {
        pv::incremental::manager().stop_all();
        if (previous) previous();
    };

    reg.methods.add("watch.start", [&reg](const pv::rpc::Json& p) {
        const auto project = reg.projects.get_ready(pv::rpc::require_string(p, "project_id"));
        const int interval = pv::rpc::clamp_int(pv::rpc::optional_int(p, "interval_ms", 1000), 250, 60000);
        const auto mode = pv::incremental::parse_watch_mode(pv::rpc::optional_string(p, "mode", "auto"));
        pv::incremental::manager().start(project, reg.adapters, reg.notifier, interval, mode);
        return pv::incremental::manager().status(project->id());
    });
    reg.methods.add("watch.stop", [&reg](const pv::rpc::Json& p) {
        const std::string id = pv::rpc::require_string(p, "project_id");
        reg.projects.get(id);
        pv::incremental::manager().stop(id);
        return pv::incremental::manager().status(id);
    });
    reg.methods.add("watch.status", [&reg](const pv::rpc::Json& p) {
        const std::string id = pv::rpc::require_string(p, "project_id");
        reg.projects.get(id);
        return pv::incremental::manager().status(id);
    });
}
