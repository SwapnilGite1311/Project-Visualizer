#include <algorithm>
#include <chrono>

#include "pv/core/error.hpp"
#include "pv/errmap/store.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

namespace {

using pv::rpc::Json;

// The element of the innermost stack frame that is in the project (Python lists it last, the other languages first;
// the parser marks that end as the origin, which may itself be a library frame).
std::string innermost_project_node(const std::vector<pv::errmap::Frame>& frames) {
    if (frames.empty()) return "";
    const bool innermost_last = frames.back().is_origin;
    auto find_in = [](auto begin, auto end) {
        const auto it = std::find_if(begin, end, [](const pv::errmap::Frame& f) { return !f.node_id.empty(); });
        return it == end ? std::string() : it->node_id;
    };
    return innermost_last ? find_in(frames.rbegin(), frames.rend()) : find_in(frames.begin(), frames.end());
}

int64_t wall_ms() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
}

}  // namespace

void pv_register_errmap(pv::session::Registry& reg) {
    pv::session::ProjectManager& pm = reg.projects;

    // Runtime errors join the list; a stack trace in the event gives mapped frames.
    pv::runtime::hub().add_listener([&pm](const std::string& project_id, const std::vector<pv::runtime::MappedEvent>& batch) {
        std::shared_ptr<pv::session::Project> project;
        for (const auto& m : batch) {
            if (!pv::runtime::is_error_event(m.ev)) continue;
            std::vector<pv::errmap::Frame> frames;
            std::string language = "unknown";
            if (m.ev.error && !m.ev.error->stack.empty()) {
                if (!project) {
                    try {
                        project = pm.get(project_id);
                    } catch (const pv::core::PvError&) {
                        return;
                    }
                }
                auto parsed = pv::errmap::parse_any(m.ev.error->stack);
                project->read([&](const pv::graph::Graph& g) {
                    pv::errmap::map_frames(parsed, g, project->root_path());
                    return 0;
                });
                // Agents report an exception on every function it passes through. Only the element where it started gets a
                // record; the callers' events are the same error propagating (one crash = one entry in the list).
                const std::string origin = innermost_project_node(parsed.frames);
                if (!origin.empty() && !m.node_id.empty() && origin != m.node_id) continue;
                frames = parsed.frames;
                language = parsed.language;
            }
            pv::errmap::store().add_runtime(project_id, m, std::move(frames), wall_ms(), language);
        }
    });

    reg.methods.add("errors.map_stack", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        auto parsed = pv::errmap::parse_any(pv::rpc::require_string(p, "text"));
        project->read([&](const pv::graph::Graph& g) {
            pv::errmap::map_frames(parsed, g, project->root_path());
            return 0;
        });
        const std::string id = pv::errmap::store().add_pasted(project->id(), parsed, wall_ms());
        Json frames = Json::array();
        for (const auto& f : parsed.frames) frames.push_back(pv::errmap::frame_to_json(f));
        return Json{{"error_id", id}, {"language", parsed.language}, {"error_type", parsed.error_type}, {"message", parsed.message}, {"frames", frames}};
    });

    reg.methods.add("errors.list", [&pm](const Json& p) {
        const std::string pid = pv::rpc::require_string(p, "project_id");
        pm.get(pid);
        Json errors = Json::array();
        for (const auto& r : pv::errmap::store().list(pid)) errors.push_back(pv::errmap::record_to_json(r));
        return Json{{"errors", errors}};
    });

    reg.methods.add("errors.clear", [&pm](const Json& p) {
        const std::string pid = pv::rpc::require_string(p, "project_id");
        pm.get(pid);
        pv::errmap::store().clear(pid, pv::rpc::optional_string(p, "error_id", ""));
        return Json{{"ok", true}};
    });
}
