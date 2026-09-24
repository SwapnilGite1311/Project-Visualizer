#include "load.hpp"
#include "pv/cli/commands.hpp"

namespace pv::cli {

int run_stats(const std::vector<std::string>& args, const parse::AdapterRegistry& adapters, std::ostream& out,
              std::ostream& err) {
    const auto parsed = parse_args(args, false);
    if (!parsed) {
        err << "usage: pv-engine stats <root> [--exclude <glob>]...\n";
        return 2;
    }
    auto loaded = load_project(*parsed, adapters, err);
    if (!loaded) return 1;
    loaded->project->read([&](const graph::Graph& g) {
        const auto nodes = g.all_nodes();
        for (core::NodeKind kind : {core::NodeKind::Project, core::NodeKind::Package, core::NodeKind::Module,
                                    core::NodeKind::Class, core::NodeKind::Function, core::NodeKind::Method,
                                    core::NodeKind::Variable, core::NodeKind::Statement, core::NodeKind::External}) {
            std::size_t count = 0;
            for (const core::Node* n : nodes) {
                if (n->kind == kind) ++count;
            }
            out << core::to_string(kind) << ": " << count << "\n";
        }
        out << "edges: " << g.edge_count() << "\n";
        out << "errors: " << loaded->project->parse_errors().size() << "\n";
        return 0;
    });
    return 0;
}

}  // namespace pv::cli
