#include <chrono>

#include "pv/fixsync/fixsync.hpp"
#include "pv/incremental/incremental.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

namespace {

int64_t wall_ms() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
}

void report(pv::rpc::Notifier& notifier, const std::string& pid, const std::vector<pv::fixsync::FixItem>& changed) {
    if (changed.empty()) return;
    nlohmann::json items = nlohmann::json::array();
    for (const auto& item : changed) {
        items.push_back(pv::fixsync::to_json(item));
        // A verified fix removes its error from the list.
        if (item.state == pv::fixsync::FixState::Verified) pv::errmap::store().clear(pid, item.error_id);
    }
    notifier.notify("fixes.changed", {{"project_id", pid}, {"items", items}});
}

}  // namespace

void pv_register_fixsync(pv::session::Registry& reg) {
    pv::session::ProjectManager& pm = reg.projects;
    pv::rpc::Notifier& notifier = reg.notifier;

    // A saved file with an erroring element in it: the error's fix is pending.
    pv::incremental::manager().add_listener(
        [&pm, &notifier](const std::string& pid, const std::vector<std::string>& files, const pv::incremental::GraphDiff&) {
            std::shared_ptr<pv::session::Project> project;
            try {
                project = pm.get(pid);
            } catch (const std::exception&) {
                return;
            }
            const auto errors = pv::errmap::store().list(pid);
            const auto changed = project->read([&](const pv::graph::Graph& g) {
                return pv::fixsync::tracker().on_files_changed(pid, errors, files, g, wall_ms());
            });
            report(notifier, pid, changed);
        });

    // Runtime calls confirm or break a pending fix.
    pv::runtime::hub().add_listener([&notifier](const std::string& pid, const std::vector<pv::runtime::MappedEvent>& batch) {
        report(notifier, pid, pv::fixsync::tracker().on_runtime(pid, batch, wall_ms()));
    });

    reg.methods.add("fixes.list", [&pm](const pv::rpc::Json& p) {
        const std::string pid = pv::rpc::require_string(p, "project_id");
        pm.get(pid);
        nlohmann::json items = nlohmann::json::array();
        for (const auto& item : pv::fixsync::tracker().list(pid)) items.push_back(pv::fixsync::to_json(item));
        return nlohmann::json{{"items", items}};
    });
}
