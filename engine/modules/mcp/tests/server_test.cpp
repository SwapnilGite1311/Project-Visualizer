#include <gtest/gtest.h>

#include <sstream>
#include <stdexcept>

#include "pv/mcp/mcp.hpp"

using namespace pv;
using Json = nlohmann::json;

namespace {

std::vector<mcp::Tool> fake_tools() {
    return {{"echo", "Echoes its argument.", {{"type", "object"}, {"properties", {{"text", {{"type", "string"}}}}}, {"required", {"text"}}},
             [](const Json& args) {
                 if (!args.contains("text")) throw std::runtime_error("missing argument: text");
                 return Json{{"echo", args["text"]}};
             }}};
}

Json request(int id, const std::string& method, Json params = Json::object()) {
    return {{"jsonrpc", "2.0"}, {"id", id}, {"method", method}, {"params", std::move(params)}};
}

}  // namespace

TEST(McpServer, InitializeNegotiatesTheVersion) {
    std::istringstream in;
    std::ostringstream out;
    mcp::McpServer server(in, out, fake_tools());
    const Json r = server.handle(request(1, "initialize", {{"protocolVersion", "2025-03-26"}, {"capabilities", Json::object()}}));
    EXPECT_EQ(r["id"], 1);
    EXPECT_EQ(r["result"]["protocolVersion"], "2025-03-26");
    EXPECT_EQ(r["result"]["serverInfo"]["name"], "project-visualizer");
    EXPECT_EQ(r["result"]["capabilities"]["tools"]["listChanged"], false);
    EXPECT_EQ(server.handle(request(2, "initialize", {{"protocolVersion", "1999-01-01"}}))["result"]["protocolVersion"], "2025-06-18");
    EXPECT_TRUE(server.handle({{"jsonrpc", "2.0"}, {"method", "notifications/initialized"}}).is_null());
    EXPECT_EQ(server.handle(request(3, "ping"))["result"], Json::object());
    EXPECT_EQ(server.handle(request(4, "resources/list"))["error"]["code"], -32601);
}

TEST(McpServer, ListsAndCallsTools) {
    std::istringstream in;
    std::ostringstream out;
    mcp::McpServer server(in, out, fake_tools());
    const Json list = server.handle(request(1, "tools/list"));
    ASSERT_EQ(list["result"]["tools"].size(), 1u);
    EXPECT_EQ(list["result"]["tools"][0]["name"], "echo");
    EXPECT_EQ(list["result"]["tools"][0]["inputSchema"]["required"], Json{"text"});

    const Json ok = server.handle(request(2, "tools/call", {{"name", "echo"}, {"arguments", {{"text", "hi"}}}}));
    EXPECT_EQ(ok["result"]["isError"], false);
    EXPECT_EQ(ok["result"]["content"][0]["type"], "text");
    EXPECT_EQ(Json::parse(ok["result"]["content"][0]["text"].get<std::string>()), (Json{{"echo", "hi"}}));

    const Json failed = server.handle(request(3, "tools/call", {{"name", "echo"}, {"arguments", Json::object()}}));
    EXPECT_EQ(failed["result"]["isError"], true);
    EXPECT_EQ(failed["result"]["content"][0]["text"], "missing argument: text");
    EXPECT_EQ(server.handle(request(4, "tools/call", {{"name", "nope"}}))["result"]["isError"], true);
}

TEST(McpServer, RunReadsOneMessagePerLine) {
    std::istringstream in(request(1, "ping").dump() + "\n\n" + Json{{"jsonrpc", "2.0"}, {"method", "notifications/initialized"}}.dump() +
                          "\r\n{not json\n" + request(2, "tools/list").dump() + "\n");
    std::ostringstream out;
    EXPECT_EQ(mcp::McpServer(in, out, fake_tools()).run(), 0);
    std::istringstream lines(out.str());
    std::vector<Json> responses;
    for (std::string line; std::getline(lines, line);) responses.push_back(Json::parse(line));
    ASSERT_EQ(responses.size(), 3u);  // ping, parse error, tools/list — nothing for the notification
    EXPECT_EQ(responses[0]["id"], 1);
    EXPECT_EQ(responses[1]["error"]["code"], -32700);
    EXPECT_EQ(responses[2]["id"], 2);
}
