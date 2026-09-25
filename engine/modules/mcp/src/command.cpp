#include <filesystem>
#include <iostream>

#include "pv/mcp/mcp.hpp"
#include "pv/rpc/notifier.hpp"
#include "pv/session/project_manager.hpp"

namespace pv::mcp {

namespace {
constexpr int kLoadTimeoutMs = 10 * 60 * 1000;
}

int run_mcp_command(const std::vector<std::string>& args, const parse::AdapterRegistry& adapters) {
    if (args.empty() || args[0].empty()) {
        std::cerr << "usage: pv-engine mcp <project-root>\n";
        return 2;
    }
    rpc::NullNotifier notifier;
    session::ProjectManager projects(adapters, notifier);
    std::cerr << "project-visualizer: loading " << args[0] << "\n";  // stdout is reserved for MCP messages
    std::string id;
    try {
        id = projects.open(args[0], {});
    } catch (const std::exception& e) {
        std::cerr << "project-visualizer: cannot open " << args[0] << ": " << e.what() << "\n";
        return 1;
    }
    if (!projects.wait_until_settled(id, kLoadTimeoutMs)) {
        std::cerr << "project-visualizer: the project did not load: " << projects.get(id)->error_message() << "\n";
        return 1;
    }
    const auto project = projects.get_ready(id);
    std::cerr << "project-visualizer: ready (" << project->read([](const graph::Graph& g) { return g.node_count(); }) << " elements)\n";
    McpServer server(std::cin, std::cout, make_tools(*project));
    return server.run();
}

}  // namespace pv::mcp
