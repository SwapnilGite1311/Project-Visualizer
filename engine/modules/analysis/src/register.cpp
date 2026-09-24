#include "pv/analysis/analysis.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

void pv_register_analysis(pv::session::Registry& reg) {
    using pv::rpc::Json;
    pv::session::ProjectManager& pm = reg.projects;
    auto project_of = [&pm](const Json& p) { return pm.get_ready(pv::rpc::require_string(p, "project_id")); };

    reg.methods.add("analysis.summary", [project_of](const Json& p) {
        const auto project = project_of(p);
        return project->read([&](const pv::graph::Graph& g) {
            return pv::analysis::build_summary(g, project->root_path(), project->syntax_error_files(), project->parse_errors());
        });
    });
    reg.methods.add("analysis.hotspots", [project_of](const Json& p) {
        const auto project = project_of(p);
        const int limit = pv::rpc::clamp_int(pv::rpc::optional_int(p, "limit", 20), 1, 100);
        return project->read([&](const pv::graph::Graph& g) { return pv::analysis::build_hotspots(g, limit); });
    });
    reg.methods.add("analysis.entry_points", [project_of](const Json& p) {
        const auto project = project_of(p);
        return project->read(
            [&](const pv::graph::Graph& g) { return pv::analysis::build_entry_points(g, project->main_guard_files()); });
    });
    reg.methods.add("analysis.boundaries", [project_of](const Json& p) {
        const auto project = project_of(p);
        return project->read([&](const pv::graph::Graph& g) { return pv::analysis::build_boundaries(g); });
    });
    reg.methods.add("analysis.call_tree", [project_of](const Json& p) {
        const auto project = project_of(p);
        const std::string node_id = pv::rpc::require_string(p, "node_id");
        const int depth = pv::rpc::optional_int(p, "depth", 3);
        return project->read([&](const pv::graph::Graph& g) { return pv::analysis::build_call_tree(g, node_id, depth); });
    });
}
