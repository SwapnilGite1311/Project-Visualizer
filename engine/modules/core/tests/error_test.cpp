#include <gtest/gtest.h>

#include <exception>
#include <string>

#include "pv/core/error.hpp"

using namespace pv::core;

TEST(CoreError, CodeAndMessage) {
    PvError e(err::NodeNotFound, "node not found: x");
    EXPECT_EQ(e.code(), -32002);
    EXPECT_EQ(std::string(e.what()), "node not found: x");
}

TEST(CoreError, CatchAsStdException) {
    try {
        throw PvError(err::NodeNotFound, "node not found: x");
    } catch (const std::exception& e) {
        EXPECT_EQ(std::string(e.what()), "node not found: x");
    }
}
