#include <gtest/gtest.h>

#include "pv/core/version.hpp"

TEST(CoreVersion, HasVersion) {
    EXPECT_STREQ(pv::core::kEngineVersion, "0.1.0");
    EXPECT_EQ(pv::core::kProtocolVersion, 1);
}
