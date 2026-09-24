#include <iostream>

#include "pv/cli/commands.hpp"
#include "pv/session/registry.hpp"

void pv_register_cli(pv::session::Registry& reg) {
    pv::parse::AdapterRegistry& adapters = reg.adapters;
    reg.cli.add("analyze", [&adapters](const std::vector<std::string>& a) {
        return pv::cli::run_analyze(a, adapters, std::cout, std::cerr);
    });
    reg.cli.add("stats", [&adapters](const std::vector<std::string>& a) {
        return pv::cli::run_stats(a, adapters, std::cout, std::cerr);
    });
}
