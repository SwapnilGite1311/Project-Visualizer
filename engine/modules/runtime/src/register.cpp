#include <chrono>

#include "pv/core/error.hpp"
#include "pv/rpc/params.hpp"
#include "pv/runtime/hub.hpp"
#include "pv/session/registry.hpp"

namespace {

using pv::rpc::Json;

int64_t steady_now_ms() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();
}

Json step_json(const pv::runtime::MappedEvent& m) {
    return Json{{"event_id", m.ev.event_id},
                {"span_id", m.ev.span_id},
                {"parent_span_id", m.ev.parent_span_id.empty() ? Json(nullptr) : Json(m.ev.parent_span_id)},
                {"node_id", m.node_id},
                {"name", m.ev.name},
                {"kind", m.ev.kind},
                {"start_ns", m.ev.start_ns},
                {"duration_ns", m.ev.duration_ns},
                {"status", m.ev.status}};
}

}  // namespace

void pv_register_runtime(pv::session::Registry& reg) {
    pv::session::ProjectManager& pm = reg.projects;
    pv::rpc::Notifier& notifier = reg.notifier;

    reg.methods.add("runtime.ingest", [&pm, &notifier](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        if (!p.contains("events") || !p["events"].is_array()) {
            throw pv::core::PvError(pv::core::err::InvalidParams, "events must be an array");
        }
        std::vector<pv::runtime::RuntimeEvent> events;
        int invalid = 0;
        for (const Json& e : p["events"]) {
            try {
                events.push_back(pv::runtime::event_from_json(e));
            } catch (const pv::core::PvError&) {
                ++invalid;
            }
        }
        const auto r = pv::runtime::hub().ingest(*project, events, notifier, steady_now_ms());
        return Json{{"accepted", r.accepted}, {"mapped", r.mapped}, {"dropped", r.dropped + invalid}};
    });

    reg.methods.add("runtime.status", [&pm](const Json& p) {
        const std::string pid = pv::rpc::require_string(p, "project_id");
        pm.get(pid);
        const auto s = pv::runtime::hub().status(pid, steady_now_ms());
        return Json{{"project_id", pid},
                    {"active", s.active},
                    {"events_total", s.events_total},
                    {"events_buffered", s.events_buffered},
                    {"last_event_ms", s.last_event_ms},
                    {"services", s.services}};
    });

    reg.methods.add("runtime.clear", [&pm](const Json& p) {
        const std::string pid = pv::rpc::require_string(p, "project_id");
        pm.get(pid);
        pv::runtime::hub().clear(pid);
        return Json{{"ok", true}};
    });

    reg.methods.add("runtime.trace", [&pm](const Json& p) {
        const std::string pid = pv::rpc::require_string(p, "project_id");
        const std::string trace_id = pv::rpc::require_string(p, "trace_id");
        pm.get(pid);
        Json steps = Json::array();
        for (const auto& m : pv::runtime::hub().trace(pid, trace_id)) steps.push_back(step_json(m));
        return Json{{"trace_id", trace_id}, {"steps", steps}};
    });

    reg.methods.add("runtime.recent_traces", [&pm](const Json& p) {
        const std::string pid = pv::rpc::require_string(p, "project_id");
        pm.get(pid);
        const int limit = pv::rpc::clamp_int(pv::rpc::optional_int(p, "limit", 20), 1, 100);
        Json traces = Json::array();
        for (const auto& t : pv::runtime::hub().recent_traces(pid, limit)) {
            traces.push_back({{"trace_id", t.trace_id},
                              {"root_name", t.root_name},
                              {"start_ns", t.start_ns},
                              {"duration_ns", t.duration_ns},
                              {"spans", t.spans},
                              {"errors", t.errors}});
        }
        return Json{{"traces", traces}};
    });
}
