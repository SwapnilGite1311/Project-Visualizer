#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/rpc/method_table.hpp"

using namespace pv;
using namespace pv::rpc;

TEST(RpcMethodTable, AddCallNames) {
    MethodTable table;
    table.add("b.second", [](const Json&) { return Json::object(); });
    table.add("a.echo", [](const Json& params) { return params; });
    EXPECT_TRUE(table.has("a.echo"));
    EXPECT_EQ(table.call("a.echo", Json{{"k", "v"}}), (Json{{"k", "v"}}));
    EXPECT_EQ(table.names(), (std::vector<std::string>{"a.echo", "b.second"}));
}

TEST(RpcMethodTable, Errors) {
    MethodTable table;
    table.add("a.echo", [](const Json& params) { return params; });
    try {
        table.add("a.echo", [](const Json& params) { return params; });
        FAIL() << "expected duplicate error";
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::Conflict);
    }
    try {
        table.call("nope", Json::object());
        FAIL() << "expected method not found";
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::MethodNotFound);
    }
}
