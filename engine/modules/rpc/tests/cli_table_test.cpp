#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/rpc/cli_table.hpp"

using namespace pv;
using namespace pv::rpc;

TEST(RpcCliTable, AddRunErrors) {
    CliTable cli;
    cli.add("hello", [](const std::vector<std::string>& args) { return static_cast<int>(args.size()); });
    EXPECT_TRUE(cli.has("hello"));
    EXPECT_EQ(cli.run("hello", {"a", "b"}), 2);
    EXPECT_EQ(cli.names(), (std::vector<std::string>{"hello"}));
    EXPECT_THROW(cli.add("hello", [](const std::vector<std::string>&) { return 0; }), core::PvError);
    EXPECT_THROW(cli.run("nope", {}), core::PvError);
}
