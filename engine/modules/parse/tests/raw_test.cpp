#include <gtest/gtest.h>

#include "pv/parse/raw.hpp"

using namespace pv::parse;

TEST(ParseRaw, Defaults) {
    RawDefinition def;
    EXPECT_EQ(def.complexity, 1);
    EXPECT_FALSE(def.parent_is_class);
    FileExtraction fx;
    EXPECT_TRUE(fx.definitions.empty());
    EXPECT_TRUE(fx.imports.empty());
    EXPECT_TRUE(fx.calls.empty());
    EXPECT_TRUE(fx.inherits.empty());
}
