#include <algorithm>

#include "pv/core/version.hpp"
#include "pv/mcp/mcp.hpp"

namespace pv::mcp {
namespace {

using Json = nlohmann::json;

Json result(const Json& id, Json value) { return {{"jsonrpc", "2.0"}, {"id", id}, {"result", std::move(value)}}; }

Json error(const Json& id, int code, const std::string& message) {
    return {{"jsonrpc", "2.0"}, {"id", id}, {"error", {{"code", code}, {"message", message}}}};
}

Json text_content(const std::string& text, bool is_error) {
    return {{"content", Json::array({{{"type", "text"}, {"text", text}}})}, {"isError", is_error}};
}

}  // namespace

McpServer::McpServer(std::istream& in, std::ostream& out, std::vector<Tool> tools) : in_(in), out_(out), tools_(std::move(tools)) {}

Json McpServer::handle(const Json& msg) {
    if (!msg.is_object() || !msg.contains("method") || !msg["method"].is_string()) {
        return msg.is_object() && msg.contains("id") ? error(msg["id"], -32600, "invalid request") : Json(nullptr);
    }
    const std::string method = msg["method"];
    const bool is_notification = !msg.contains("id");
    const Json id = is_notification ? Json(nullptr) : msg["id"];
    const Json params = msg.value("params", Json::object());

    if (is_notification) return nullptr;  // notifications/initialized, notifications/cancelled…: nothing to answer

    if (method == "initialize") {
        const std::string requested = params.value("protocolVersion", "");
        const bool known = std::find(kSupportedProtocols.begin(), kSupportedProtocols.end(), requested) != kSupportedProtocols.end();
        return result(id, {{"protocolVersion", known ? requested : kLatestProtocol},
                           {"capabilities", {{"tools", {{"listChanged", false}}}}},
                           {"serverInfo", {{"name", "project-visualizer"}, {"version", core::kEngineVersion}}}});
    }
    if (method == "ping") return result(id, Json::object());
    if (method == "tools/list") {
        Json list = Json::array();
        for (const Tool& t : tools_) list.push_back({{"name", t.name}, {"description", t.description}, {"inputSchema", t.input_schema}});
        return result(id, {{"tools", list}});
    }
    if (method == "tools/call") {
        const std::string name = params.value("name", "");
        const auto tool = std::find_if(tools_.begin(), tools_.end(), [&](const Tool& t) { return t.name == name; });
        if (tool == tools_.end()) return result(id, text_content("unknown tool: " + name, true));
        try {
            const Json args = params.contains("arguments") && params["arguments"].is_object() ? params["arguments"] : Json::object();
            return result(id, text_content(tool->fn(args).dump(2), false));
        } catch (const std::exception& e) {
            return result(id, text_content(e.what(), true));  // tool errors go back to the agent, not as protocol errors
        }
    }
    return error(id, -32601, "method not found: " + method);
}

int McpServer::run() {
    std::string line;
    while (std::getline(in_, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (line.find_first_not_of(" \t") == std::string::npos) continue;
        Json response;
        try {
            response = handle(Json::parse(line));
        } catch (const Json::parse_error&) {
            response = error(nullptr, -32700, "parse error");
        }
        if (response.is_null()) continue;
        out_ << response.dump() << '\n';
        out_.flush();
    }
    return 0;
}

}  // namespace pv::mcp
