#include <algorithm>

#include "pv/modtrace/modtrace.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

namespace {
// Fixed here so modtrace does not depend on the health module's thresholds.
constexpr int kLoopThreshold = 1000;
}  // namespace

void pv_register_modtrace(pv::session::Registry& reg) {
    using pv::rpc::Json;
    pv::session::ProjectManager& pm = reg.projects;

    reg.methods.add("modtrace.boundaries", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const int window_ms = pv::rpc::clamp_int(pv::rpc::optional_int(p, "window_ms", 300000), 1000, 3600000);
        const auto events = pv::runtime::hub().events(project->id());
        int64_t newest = 0;
        for (const auto& m : events) newest = std::max(newest, m.ev.start_ns);
        const int64_t since = newest - static_cast<int64_t>(window_ms) * 1000000;
        return project->read([&](const pv::graph::Graph& g) {
            Json crossings = Json::array();
            for (const auto& c : pv::modtrace::boundaries(g, events, since, kLoopThreshold)) {
                crossings.push_back({{"from_id", c.from_id}, {"to_id", c.to_id}, {"count", c.count}, {"avg_ms", c.avg_ms},
                                     {"errors", c.errors}, {"stalls", c.stalls}, {"loops", c.loops}});
            }
            return Json{{"crossings", crossings}};
        });
    });

    reg.methods.add("modtrace.follow", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string trace_id = pv::rpc::require_string(p, "trace_id");
        const std::string direction = pv::rpc::require_string(p, "direction");
        const std::string from = pv::rpc::optional_string(p, "from_node_id", "");
        const auto events = pv::runtime::hub().events(project->id());
        return project->read([&](const pv::graph::Graph& g) {
            Json hops = Json::array();
            for (const auto& h : pv::modtrace::follow(g, events, trace_id, direction, from)) {
                hops.push_back({{"from_id", h.from_id}, {"to_id", h.to_id}, {"start_ns", h.start_ns}, {"duration_ns", h.duration_ns},
                                {"status", h.status}});
            }
            return Json{{"hops", hops}};
        });
    });
}
