#include <gtest/gtest.h>

#include "pv/core/paths.hpp"

using namespace pv::core;

TEST(CorePaths, Normalize) {
    EXPECT_EQ(normalize_path("src\\app\\main.py"), "src/app/main.py");
    EXPECT_EQ(normalize_path("./src//app/./x.py"), "src/app/x.py");
    EXPECT_EQ(normalize_path("src/app/../lib/y.py"), "src/lib/y.py");
    EXPECT_EQ(normalize_path("../a/b"), "../a/b");
    EXPECT_EQ(normalize_path("/home/u/p/"), "/home/u/p");
    EXPECT_EQ(normalize_path("C:\\code\\proj\\"), "C:/code/proj");
    EXPECT_EQ(normalize_path("C:\\"), "C:/");
    EXPECT_EQ(normalize_path(""), "");
    EXPECT_EQ(normalize_path("."), "");
}
