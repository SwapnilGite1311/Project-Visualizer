#include <gtest/gtest.h>

#include <sstream>

#include "pv/core/log.hpp"

using namespace pv::core;

TEST(CoreLog, WritesInfo) {
    std::ostringstream out;
    set_log_stream(&out);
    log_info("hello");
    EXPECT_EQ(out.str(), "[pv-engine] INFO hello\n");
    set_log_level(LogLevel::Info);
    set_log_stream(nullptr);
}

TEST(CoreLog, RespectsLevel) {
    std::ostringstream out;
    set_log_stream(&out);
    set_log_level(LogLevel::Warn);
    log_info("x");
    EXPECT_EQ(out.str(), "");
    log_error("y");
    EXPECT_EQ(out.str(), "[pv-engine] ERROR y\n");
    set_log_level(LogLevel::Info);
    set_log_stream(nullptr);
}
