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

TEST(CorePaths, Parts) {
    EXPECT_EQ(path_parent("src/app/main.py"), "src/app");
    EXPECT_EQ(path_parent("main.py"), "");
    EXPECT_EQ(path_parent("C:/code"), "C:");
    EXPECT_EQ(path_file_name("src/app/main.py"), "main.py");
    EXPECT_EQ(path_stem("src/app/main.py"), "main");
    EXPECT_EQ(path_stem("a.tar.gz"), "a.tar");
    EXPECT_EQ(path_stem(".env"), ".env");
    EXPECT_EQ(path_extension("X/Main.PY"), ".py");
    EXPECT_EQ(path_extension("Makefile"), "");
    EXPECT_EQ(path_extension(".env"), "");
}

TEST(CorePaths, RelativeTo) {
    EXPECT_EQ(path_relative_to("C:/code/proj", "C:/code/proj/src/a.py"), "src/a.py");
    EXPECT_EQ(path_relative_to("/home/u/p", "/home/u/p"), "");
    EXPECT_FALSE(path_relative_to("/home/u/p", "/home/u/px/a.py").has_value());
    EXPECT_FALSE(path_relative_to("/home/u/p", "/home/u/other/a.py").has_value());
    EXPECT_EQ(path_relative_to("C:\\code\\proj", "C:\\code\\proj\\x.py"), "x.py");
    EXPECT_EQ(path_relative_to("C:/", "C:/x/y"), "x/y");
}

#ifdef _WIN32
TEST(CorePaths, RelativeToIgnoresCaseOnWindows) {
    EXPECT_EQ(path_relative_to("C:/Code/Proj", "c:/code/proj/A.py"), "A.py");
}
#endif

TEST(CorePaths, Join) {
    EXPECT_EQ(path_join("", "x.py"), "x.py");
    EXPECT_EQ(path_join("C:/code", "src/a.py"), "C:/code/src/a.py");
}
