#include <gtest/gtest.h>

#include "pv/fs/fs.hpp"

using pv::fs::glob_match;

TEST(FsGlob, Matching) {
    EXPECT_TRUE(glob_match("*.py", "a.py"));
    EXPECT_FALSE(glob_match("*.py", "x/a.py"));
    EXPECT_TRUE(glob_match("**/*.py", "x/y/a.py"));
    EXPECT_TRUE(glob_match("**/*.py", "a.py"));
    EXPECT_TRUE(glob_match("node_modules/**", "node_modules/a/b.js"));
    EXPECT_TRUE(glob_match("**/node_modules/**", "web/node_modules/"));
    EXPECT_TRUE(glob_match("a?c.txt", "abc.txt"));
    EXPECT_FALSE(glob_match("a.py", "aXpy"));
}
