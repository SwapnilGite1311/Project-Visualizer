#include "load.hpp"

namespace pv::cli {

std::optional<CliArgs> parse_args(const std::vector<std::string>& args, bool allow_out) {
    CliArgs parsed;
    for (std::size_t i = 0; i < args.size(); ++i) {
        const std::string& a = args[i];
        if (a == "--exclude" && i + 1 < args.size()) {
            parsed.excludes.push_back(args[++i]);
        } else if (allow_out && a == "--out" && i + 1 < args.size()) {
            parsed.out_file = args[++i];
        } else if (a.rfind("--", 0) == 0 || !parsed.root.empty()) {
            return std::nullopt;
        } else {
            parsed.root = a;
        }
    }
    if (parsed.root.empty()) return std::nullopt;
    return parsed;
}

std::unique_ptr<LoadedProject> load_project(const CliArgs& args, const parse::AdapterRegistry& adapters, std::ostream& err) {
    auto loaded = std::make_unique<LoadedProject>();
    loaded->manager = std::make_unique<session::ProjectManager>(adapters, loaded->notifier);
    const std::string id = loaded->manager->open(args.root, session::OpenOptions{args.excludes});
    const bool ready = loaded->manager->wait_until_settled(id, 3600000);
    loaded->project = loaded->manager->get(id);
    if (!ready) {
        const std::string message = loaded->project->error_message();
        err << (message.empty() ? "loading timed out" : message) << "\n";
        return nullptr;
    }
    return loaded;
}

}  // namespace pv::cli
