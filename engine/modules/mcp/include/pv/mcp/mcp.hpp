#pragma once
#include <functional>
#include <istream>
#include <ostream>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/parse/registry.hpp"
#include "pv/session/project.hpp"

namespace pv::mcp {

// Model Context Protocol server over stdio: JSON-RPC 2.0, one JSON message per line (no Content-Length headers).
using ToolFn = std::function<nlohmann::json(const nlohmann::json& args)>;

struct Tool {
    std::string name, description;
    nlohmann::json input_schema;
    ToolFn fn;
};

inline constexpr const char* kLatestProtocol = "2025-06-18";
inline const std::vector<std::string> kSupportedProtocols = {"2024-11-05", "2025-03-26", "2025-06-18"};

class McpServer {
public:
    McpServer(std::istream& in, std::ostream& out, std::vector<Tool> tools);
    int run();                                          // until end of input; returns 0
    nlohmann::json handle(const nlohmann::json& msg);   // the response, or null for notifications

private:
    std::istream& in_;
    std::ostream& out_;
    std::vector<Tool> tools_;
};

// The tools agents use before editing: overview, search, node, dependencies, impact, path.
std::vector<Tool> make_tools(session::Project& project);

// `pv-engine mcp <root>`: loads the project (progress on stderr only: stdout is the MCP channel), then serves the tools.
int run_mcp_command(const std::vector<std::string>& args, const parse::AdapterRegistry& adapters);

}  // namespace pv::mcp
