#include <gtest/gtest.h>

#include <functional>

#include "pv/core/error.hpp"
#include "pv/rpc/params.hpp"

using namespace pv;
using namespace pv::rpc;

namespace {

std::string error_of(const std::function<void()>& fn) {
    try {
        fn();
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::InvalidParams);
        return e.what();
    }
    return "";
}

}  // namespace

TEST(RpcParams, RequireString) {
    EXPECT_EQ(require_string(Json{{"id", "x"}}, "id"), "x");
    EXPECT_EQ(error_of([] { require_string(Json::object(), "id"); }), "missing string param: id");
    EXPECT_EQ(error_of([] { require_string(Json{{"id", 3}}, "id"); }), "missing string param: id");
    EXPECT_EQ(error_of([] { require_string(Json{{"id", ""}}, "id"); }), "missing string param: id");
}

TEST(RpcParams, OptionalString) {
    EXPECT_EQ(optional_string(Json::object(), "k", "fb"), "fb");
    EXPECT_EQ(optional_string(Json{{"k", nullptr}}, "k", "fb"), "fb");
    EXPECT_EQ(optional_string(Json{{"k", "v"}}, "k", "fb"), "v");
    EXPECT_EQ(error_of([] { optional_string(Json{{"k", 1}}, "k", "fb"); }), "param must be a string: k");
}

TEST(RpcParams, OptionalInt) {
    EXPECT_EQ(optional_int(Json::object(), "n", 5), 5);
    EXPECT_EQ(optional_int(Json{{"n", nullptr}}, "n", 5), 5);
    EXPECT_EQ(optional_int(Json{{"n", 7}}, "n", 5), 7);
    EXPECT_EQ(error_of([] { optional_int(Json{{"n", "7"}}, "n", 5); }), "param must be an integer: n");
    EXPECT_EQ(error_of([] { optional_int(Json{{"n", 1.5}}, "n", 5); }), "param must be an integer: n");
}

TEST(RpcParams, ClampInt) {
    EXPECT_EQ(clamp_int(5, 1, 10), 5);
    EXPECT_EQ(clamp_int(-1, 1, 10), 1);
    EXPECT_EQ(clamp_int(99, 1, 10), 10);
}

TEST(RpcParams, OptionalStringList) {
    EXPECT_TRUE(optional_string_list(Json::object(), "l").empty());
    EXPECT_TRUE(optional_string_list(Json{{"l", nullptr}}, "l").empty());
    EXPECT_EQ(optional_string_list(Json{{"l", {"a", "b"}}}, "l"), (std::vector<std::string>{"a", "b"}));
    EXPECT_EQ(error_of([] { optional_string_list(Json{{"l", "a"}}, "l"); }), "param must be a list of strings: l");
    EXPECT_EQ(error_of([] { optional_string_list(Json{{"l", {"a", 1}}}, "l"); }),
              "param must be a list of strings: l");
}
