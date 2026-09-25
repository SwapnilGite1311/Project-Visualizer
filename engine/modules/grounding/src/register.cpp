#include <chrono>

#include "pv/core/error.hpp"
#include "pv/grounding/grounding.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

namespace {

int64_t steady_ms() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();
}

}  // namespace

void pv_register_grounding(pv::session::Registry& reg) {
    pv::session::ProjectManager& pm = reg.projects;

    reg.methods.add("grounding.for_error", [&pm](const pv::rpc::Json& p) {
        const std::string pid = pv::rpc::require_string(p, "project_id");
        const auto project = pm.get_ready(pid);
        const auto record = pv::errmap::store().get(pid, pv::rpc::require_string(p, "error_id"));
        if (!record) throw pv::core::PvError(pv::core::err::NodeNotFound, "error not found");
        const int64_t now = steady_ms();
        return project->read([&](const pv::graph::Graph& g) {
            return pv::grounding::build_error_pack(g, project->root_path(), *record, pv::health::tracker().evaluate(pid, g, now));
        });
    });

    reg.methods.add("grounding.for_question", [&pm](const pv::rpc::Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string question = pv::rpc::require_string(p, "question");
        if (question.size() > 2000) throw pv::core::PvError(pv::core::err::InvalidParams, "question is longer than 2000 characters");
        const int max_chars = pv::rpc::clamp_int(pv::rpc::optional_int(p, "max_chars", 24000), 2000, 60000);
        return project->read([&](const pv::graph::Graph& g) {
            const std::string digest = pv::grounding::build_digest(g, project->main_guard_files(), 4000);
            return pv::grounding::build_question_pack(g, project->root_path(), question, digest, max_chars);
        });
    });

    reg.methods.add("grounding.digest", [&pm](const pv::rpc::Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const int max_chars = pv::rpc::clamp_int(pv::rpc::optional_int(p, "max_chars", 6000), 500, 60000);
        return project->read([&](const pv::graph::Graph& g) {
            return pv::rpc::Json{{"text", pv::grounding::build_digest(g, project->main_guard_files(), max_chars)}};
        });
    });

    reg.methods.add("grounding.check_citations", [&pm](const pv::rpc::Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        if (!p.contains("node_ids") || !p["node_ids"].is_array()) {
            throw pv::core::PvError(pv::core::err::InvalidParams, "node_ids must be an array of strings");
        }
        std::vector<std::string> ids;
        for (const auto& id : p["node_ids"]) {
            if (!id.is_string()) throw pv::core::PvError(pv::core::err::InvalidParams, "node_ids must be an array of strings");
            ids.push_back(id.get<std::string>());
        }
        return project->read([&](const pv::graph::Graph& g) { return pv::grounding::check_citations(g, ids); });
    });
}
