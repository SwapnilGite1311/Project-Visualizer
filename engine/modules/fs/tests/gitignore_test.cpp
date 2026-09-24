#include <gtest/gtest.h>

#include "pv/fs/fs.hpp"

using namespace pv::fs;

TEST(FsGitIgnore, Rules) {
    GitIgnore gi;
    gi.add_file("", "# c\n*.log\nbuild/\n/secret.txt\n!keep.log\n");
    EXPECT_TRUE(gi.ignored("a.log", false));
    EXPECT_TRUE(gi.ignored("x/b.log", false));
    EXPECT_FALSE(gi.ignored("keep.log", false));
    EXPECT_TRUE(gi.ignored("build", true));
    EXPECT_FALSE(gi.ignored("build", false));
    EXPECT_TRUE(gi.ignored("src/build/x.py", false));
    EXPECT_TRUE(gi.ignored("secret.txt", false));
    EXPECT_FALSE(gi.ignored("sub/secret.txt", false));

    gi.add_file("sub", "*.tmp");
    EXPECT_TRUE(gi.ignored("sub/a.tmp", false));
    EXPECT_FALSE(gi.ignored("a.tmp", false));
}
