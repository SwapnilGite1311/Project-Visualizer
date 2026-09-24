#include <gtest/gtest.h>

#include <sstream>

#include "pv/core/error.hpp"
#include "pv/rpc/framing.hpp"

using namespace pv;
using namespace pv::rpc;

TEST(RpcFraming, RoundTrip) {
    std::stringstream s;
    write_message(s, R"({"a":1})");
    EXPECT_EQ(read_message(s), R"({"a":1})");
}

TEST(RpcFraming, TwoMessagesInOrder) {
    std::stringstream s;
    write_message(s, "first");
    write_message(s, "second");
    EXPECT_EQ(read_message(s), "first");
    EXPECT_EQ(read_message(s), "second");
    EXPECT_FALSE(read_message(s).has_value());
}

TEST(RpcFraming, EmptyStream) {
    std::stringstream s;
    EXPECT_FALSE(read_message(s).has_value());
}

TEST(RpcFraming, LowerCaseHeaderAndExtraHeaders) {
    std::stringstream s("content-length: 3\r\nContent-Type: x\r\n\r\nabc");
    EXPECT_EQ(read_message(s), "abc");
}

TEST(RpcFraming, MissingLengthThrows) {
    std::stringstream s("Content-Type: x\r\n\r\nabc");
    EXPECT_THROW(read_message(s), core::PvError);
}

TEST(RpcFraming, TruncatedBodyThrows) {
    std::stringstream s("Content-Length: 10\r\n\r\nabc");
    EXPECT_THROW(read_message(s), core::PvError);
}
