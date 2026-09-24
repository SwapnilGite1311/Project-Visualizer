#include <filesystem>

#include "pv/core/error.hpp"
#include "pv/core/version.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

void pv_register_session(pv::session::Registry& reg) {
    using pv::rpc::Json;
    pv::session::ProjectManager& pm = reg.projects;
    pv::parse::AdapterRegistry& adapters = reg.adapters;
    std::function<void()>& shutdown = reg.request_shutdown;

    reg.methods.add("engine.ping", [](const Json&) {
        return Json{{"version", pv::core::kEngineVersion}, {"protocol", pv::core::kProtocolVersion}};
    });

    reg.methods.add("engine.shutdown", [&shutdown](const Json&) {
        if (shutdown) shutdown();
        return Json{{"ok", true}};
    });

    reg.methods.add("lang.list", [&adapters](const Json&) {
        Json languages = Json::array();
        for (const pv::parse::LanguageAdapter* a : adapters.all()) {
            languages.push_back(Json{{"id", a->id()}, {"extensions", a->extensions()}});
        }
        return Json{{"languages", languages}};
    });

    reg.methods.add("project.open", [&pm](const Json& p) {
        const std::string root = pv::rpc::require_string(p, "root_path");
        const std::filesystem::path fs_root(std::u8string(reinterpret_cast<const char8_t*>(root.data()), root.size()));
        std::error_code ec;
        if (!std::filesystem::is_directory(fs_root, ec)) {
            throw pv::core::PvError(pv::core::err::Io, "folder not found: " + root);
        }
        const std::string id = pm.open(root, pv::session::OpenOptions{pv::rpc::optional_string_list(p, "exclude_globs")});
        return Json{{"project_id", id}};
    });

    reg.methods.add("project.status", [&pm](const Json& p) {
        const auto project = pm.get(pv::rpc::require_string(p, "project_id"));
        return Json{{"project_id", project->id()},
                    {"root_path", project->root_path()},
                    {"state", pv::session::to_string(project->state())},
                    {"files_total", project->files_total()},
                    {"files_done", project->files_done()},
                    {"error_message", project->error_message()}};
    });

    reg.methods.add("project.close", [&pm](const Json& p) {
        pm.close(pv::rpc::require_string(p, "project_id"));
        return Json{{"ok", true}};
    });
}
