#pragma once
#include <memory>
#include <stdexcept>
#include <string>
#include "pv/session/registry.hpp"

namespace pv::session {
class TestEnv {
public:
    explicit TestEnv(std::unique_ptr<parse::LanguageAdapter> adapter) {
        adapters.add(std::move(adapter));
        projects = std::make_unique<ProjectManager>(adapters, notifier);
        reg = std::make_unique<Registry>(Registry{methods, cli, *projects, adapters, notifier, [] {}});
    }
    std::string open_and_wait(const std::string& root) {
        std::string id = projects->open(root, {});
        if (!projects->wait_until_settled(id, 20000)) throw std::runtime_error("project did not load: " + root);
        return id;
    }
    rpc::Json call(const std::string& method, const rpc::Json& params) { return methods.call(method, params); }
    rpc::MethodTable methods;
    rpc::CliTable cli;
    parse::AdapterRegistry adapters;
    rpc::RecordingNotifier notifier;
    std::unique_ptr<ProjectManager> projects;
    std::unique_ptr<Registry> reg;
};
inline std::string pyproj_small_path() {
    return std::string(PV_ENGINE_SOURCE_DIR) + "/modules/lang_python/tests/fixtures/pyproj_small";
}
}  // namespace pv::session
