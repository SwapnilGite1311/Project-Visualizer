#include <chrono>
#include <filesystem>

#include "pv/core/error.hpp"
#include "pv/metrics/recorder.hpp"
#include "pv/metrics/series.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

namespace {

using pv::rpc::Json;

int64_t wall_ms() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
}

int64_t require_int64(const Json& p, const std::string& key) {
    if (!p.contains(key) || !p[key].is_number_integer()) {
        throw pv::core::PvError(pv::core::err::InvalidParams, "missing integer param: " + key);
    }
    return p[key].get<int64_t>();
}

}  // namespace

void pv_register_metrics(pv::session::Registry& reg) {
    pv::session::ProjectManager& pm = reg.projects;
    // Every runtime batch goes into the minute history of its project.
    pv::runtime::hub().add_listener([&pm](const std::string& pid, const std::vector<pv::runtime::MappedEvent>& batch) {
        std::shared_ptr<pv::session::Project> project;
        try {
            project = pm.get(pid);
        } catch (const pv::core::PvError&) {
            return;
        }
        pv::metrics::recorder().on_events(pid, project->root_path(), batch, wall_ms());
    });

    reg.methods.add("metrics.series", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        auto& rec = pv::metrics::recorder();
        pv::metrics::MetricsStore* store = rec.store_for(project->id(), project->root_path());
        rec.flush(project->id(), wall_ms(), true);
        const int64_t bucket = p.contains("bucket_ms") ? require_int64(p, "bucket_ms") : 3600000;
        return project->read([&](const pv::graph::Graph& g) {
            return pv::metrics::series(*store, g, pv::rpc::require_string(p, "node_id"), pv::rpc::require_string(p, "metric"),
                                       require_int64(p, "from_ms"), require_int64(p, "to_ms"), bucket);
        });
    });

    reg.methods.add("metrics.export", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string out_path = pv::rpc::require_string(p, "out_path");
        if (!std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(out_path.data()), out_path.size())).is_absolute()) {
            throw pv::core::PvError(pv::core::err::InvalidParams, "out_path must be absolute");
        }
        auto& rec = pv::metrics::recorder();
        pv::metrics::MetricsStore* store = rec.store_for(project->id(), project->root_path());
        rec.flush(project->id(), wall_ms(), true);
        const int64_t from_minute = p.contains("from_ms") ? require_int64(p, "from_ms") / 60000 : 0;
        return project->read([&](const pv::graph::Graph& g) { return pv::metrics::export_dataset(*store, g, out_path, from_minute); });
    });
}
