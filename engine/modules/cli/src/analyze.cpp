#include <filesystem>
#include <fstream>

#include "load.hpp"
#include "pv/cli/commands.hpp"
#include "pv/core/json.hpp"
#include "pv/core/version.hpp"

namespace pv::cli {

int run_analyze(const std::vector<std::string>& args, const parse::AdapterRegistry& adapters, std::ostream& out,
                std::ostream& err) {
    const auto parsed = parse_args(args, true);
    if (!parsed) {
        err << "usage: pv-engine analyze <root> [--out <file>] [--exclude <glob>]...\n";
        return 2;
    }
    auto loaded = load_project(*parsed, adapters, err);
    if (!loaded) return 1;
    const auto& project = loaded->project;

    const core::Json result = project->read([&](const graph::Graph& g) {
        core::Json nodes = core::Json::array();
        for (const core::Node* n : g.all_nodes()) nodes.push_back(*n);
        core::Json edges = core::Json::array();
        for (const core::Edge* e : g.all_edges()) edges.push_back(*e);
        return core::Json{{"engine_version", core::kEngineVersion},
                          {"root_path", project->root_path()},
                          {"nodes", nodes},
                          {"edges", edges},
                          {"errors", project->parse_errors()},
                          {"main_guard_files", project->main_guard_files()},
                          {"syntax_error_files", project->syntax_error_files()}};
    });

    if (parsed->out_file.empty()) {
        out << result.dump() << "\n";
        return 0;
    }
    const std::string& file = parsed->out_file;
    std::ofstream file_out(std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(file.data()), file.size())),
                           std::ios::binary);
    if (!file_out) {
        err << "cannot write file: " << file << "\n";
        return 1;
    }
    file_out << result.dump();
    return 0;
}

}  // namespace pv::cli
