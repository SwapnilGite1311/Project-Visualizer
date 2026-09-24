#include <gtest/gtest.h>

#include <sstream>

#include "pv/rpc/framing.hpp"
#include "pv/rpc/server.hpp"

using namespace pv::rpc;

namespace {

std::string framed(const Json& message) {
    std::ostringstream out;
    write_message(out, message.dump());
    return out.str();
}

Json echo_request(int id) {
    return Json{{"jsonrpc", "2.0"}, {"id", id}, {"method", "a.echo"}, {"params", Json{{"n", id}}}};
}

std::vector<Json> read_all(const std::string& text) {
    std::stringstream in(text);
    std::vector<Json> out;
    while (auto body = read_message(in)) out.push_back(Json::parse(*body));
    return out;
}

}  // namespace

TEST(RpcServer, AnswersRequestsInOrder) {
    std::stringstream in(framed(echo_request(1)) + framed(echo_request(2)));
    std::stringstream out;
    StdioServer server(in, out);
    MethodTable table;
    table.add("a.echo", [](const Json& params) { return params; });
    EXPECT_EQ(server.run(table), 0);
    const std::vector<Json> responses = read_all(out.str());
    ASSERT_EQ(responses.size(), 2u);
    EXPECT_EQ(responses[0]["id"], 1);
    EXPECT_EQ(responses[1]["id"], 2);
}

TEST(RpcServer, BadJsonContinues) {
    std::ostringstream bad;
    write_message(bad, "not json");
    std::stringstream in(bad.str() + framed(echo_request(3)));
    std::stringstream out;
    StdioServer server(in, out);
    MethodTable table;
    table.add("a.echo", [](const Json& params) { return params; });
    EXPECT_EQ(server.run(table), 0);
    const std::vector<Json> responses = read_all(out.str());
    ASSERT_EQ(responses.size(), 2u);
    EXPECT_EQ(responses[0]["error"]["code"], -32700);
    EXPECT_EQ(responses[1]["id"], 3);
}

TEST(RpcServer, StopAfterCurrentMessage) {
    const Json stop = Json{{"jsonrpc", "2.0"}, {"id", 1}, {"method", "a.stop"}};
    std::stringstream in(framed(stop) + framed(echo_request(2)));
    std::stringstream out;
    StdioServer server(in, out);
    MethodTable table;
    table.add("a.stop", [&server](const Json&) {
        server.request_stop();
        return Json{{"ok", true}};
    });
    table.add("a.echo", [](const Json& params) { return params; });
    EXPECT_EQ(server.run(table), 0);
    const std::vector<Json> responses = read_all(out.str());
    ASSERT_EQ(responses.size(), 1u);
    EXPECT_EQ(responses[0]["result"]["ok"], true);
}

TEST(RpcServer, NotifyWritesFramedNotification) {
    std::stringstream in;
    std::stringstream out;
    StdioServer server(in, out);
    server.notify("project.progress", Json{{"files_done", 1}});
    const std::vector<Json> messages = read_all(out.str());
    ASSERT_EQ(messages.size(), 1u);
    EXPECT_FALSE(messages[0].contains("id"));
    EXPECT_EQ(messages[0]["method"], "project.progress");
}
