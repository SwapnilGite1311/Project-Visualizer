#include "pv/mcp/mcp.hpp"
#include "pv/session/registry.hpp"

void pv_register_mcp(pv::session::Registry& reg) {
    reg.cli.add("mcp", [&reg](const std::vector<std::string>& a) { return pv::mcp::run_mcp_command(a, reg.adapters); });
}
