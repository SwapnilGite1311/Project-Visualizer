#pragma once
#include <memory>
#include <optional>
#include <ostream>
#include <string>
#include <vector>

#include "pv/parse/registry.hpp"
#include "pv/rpc/notifier.hpp"
#include "pv/session/project_manager.hpp"

namespace pv::cli {

struct CliArgs {
    std::string root;
    std::string out_file;
    std::vector<std::string> excludes;
};

// Parses "<root> [--out <file>] [--exclude <glob>]...". Returns nullopt on a usage error.
std::optional<CliArgs> parse_args(const std::vector<std::string>& args, bool allow_out);

// Loads a project synchronously. Returns nullptr (after printing the error) when loading fails.
struct LoadedProject {
    rpc::NullNotifier notifier;
    std::unique_ptr<session::ProjectManager> manager;
    std::shared_ptr<session::Project> project;
};
std::unique_ptr<LoadedProject> load_project(const CliArgs& args, const parse::AdapterRegistry& adapters, std::ostream& err);

}  // namespace pv::cli
