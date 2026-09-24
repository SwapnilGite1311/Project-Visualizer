#pragma once
#include <functional>
#include "pv/parse/registry.hpp"
#include "pv/rpc/cli_table.hpp"
#include "pv/rpc/method_table.hpp"
#include "pv/rpc/notifier.hpp"
#include "pv/session/project_manager.hpp"

namespace pv::session {
struct Registry {
    rpc::MethodTable& methods;
    rpc::CliTable& cli;
    ProjectManager& projects;
    parse::AdapterRegistry& adapters;
    rpc::Notifier& notifier;
    std::function<void()> request_shutdown;
};
}  // namespace pv::session
