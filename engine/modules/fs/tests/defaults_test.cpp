#include <gtest/gtest.h>

#include "pv/fs/fs.hpp"

using namespace pv::fs;

TEST(FsDefaults, Excludes) {
    EXPECT_EQ(default_excludes().size(), 19u);
    const GlobSet set(default_excludes());
    EXPECT_TRUE(set.matches("node_modules/"));
    EXPECT_TRUE(set.matches("src/app/__pycache__/x.pyc"));
    EXPECT_FALSE(set.matches("src/app/main.py"));
}

TEST(FsDefaults, Binary) {
    EXPECT_TRUE(looks_binary(std::string("ab\0c", 4)));
    EXPECT_FALSE(looks_binary("abc"));
}
