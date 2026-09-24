#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/rpc/dispatch.hpp"

using namespace pv;
using namespace pv::rpc;

namespace {

MethodTable make_table() {
    MethodTable table;
    table.add("a.echo", [](const Json& params) { return params; });
    table.add("a.fail", [](const Json&) -> Json { throw core::PvError(core::err::NodeNotFound, "x"); });
    table.add("a.at", [](const Json& params) -> Json { return params.at("missing"); });
    return table;
}

Json request(const Json& id, const std::string& method, const Json& params) {
    return Json{{"jsonrpc", "2.0"}, {"id", id}, {"method", method}, {"params", params}};
}

}  // namespace

TEST(RpcDispatch, Success) {
    const Json resp = handle_request(make_table(), request(1, "a.echo", Json{{"v", 2}}));
    EXPECT_EQ(resp["jsonrpc"], "2.0");
    EXPECT_EQ(resp["id"], 1);
    EXPECT_EQ(resp["result"], (Json{{"v", 2}}));
}

TEST(RpcDispatch, ErrorCodes) {
    const MethodTable table = make_table();
    EXPECT_EQ(handle_request(table, request(1, "nope", Json::object()))["error"]["code"], -32601);
    const Json fail = handle_request(table, request(2, "a.fail", Json::object()));
    EXPECT_EQ(fail["error"]["code"], -32002);
    EXPECT_EQ(fail["error"]["message"], "x");
    EXPECT_EQ(handle_request(table, request(3, "a.at", Json::object()))["error"]["code"], -32602);
    EXPECT_EQ(handle_request(table, Json{{"id", 4}, {"method", "a.echo"}})["error"]["code"], -32600);
    EXPECT_EQ(handle_request(table, Json::array())["error"]["code"], -32600);
}

TEST(RpcDispatch, NotificationsReturnNull) {
    const Json notification = Json{{"jsonrpc", "2.0"}, {"method", "a.echo"}, {"params", Json::object()}};
    EXPECT_TRUE(handle_request(make_table(), notification).is_null());
}

TEST(RpcDispatch, StringIdEchoed) {
    EXPECT_EQ(handle_request(make_table(), request("abc", "a.echo", Json::object()))["id"], "abc");
}
