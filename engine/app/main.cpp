#include <iostream>
#include <string>
#include <vector>
#ifdef _WIN32
#include <fcntl.h>
#include <io.h>
#endif
#include "pv/core/log.hpp"
#include "pv/core/version.hpp"
#include "pv/parse/registry.hpp"
#include "pv/rpc/cli_table.hpp"
#include "pv/rpc/method_table.hpp"
#include "pv/rpc/server.hpp"
#include "pv/session/project_manager.hpp"
#include "pv/session/registry.hpp"

namespace pv::app {
void register_all_modules(pv::session::Registry& reg);
}

int main(int argc, char** argv) {
#ifdef _WIN32
    _setmode(_fileno(stdin), _O_BINARY);
    _setmode(_fileno(stdout), _O_BINARY);
#endif
    std::ios::sync_with_stdio(false);
    pv::rpc::StdioServer server(std::cin, std::cout);
    pv::rpc::MethodTable methods;
    pv::rpc::CliTable cli;
    pv::parse::AdapterRegistry adapters;
    pv::session::ProjectManager projects(adapters, server);
    pv::session::Registry reg{methods, cli, projects, adapters, server, [&server] { server.request_stop(); }};
    pv::app::register_all_modules(reg);

    if (argc >= 2) {
        const std::string command = argv[1];
        if (command == "--version") {
            std::cout << pv::core::kEngineVersion << "\n";
            return 0;
        }
        if (cli.has(command)) {
            return cli.run(command, std::vector<std::string>(argv + 2, argv + argc));
        }
        std::cerr << "unknown command: " << command << "\n";
        return 2;
    }
    pv::core::log_info(std::string("pv-engine ") + pv::core::kEngineVersion + " ready");
    return server.run(methods);
}
