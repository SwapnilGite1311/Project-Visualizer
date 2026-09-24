#include <gtest/gtest.h>

#include <filesystem>
#include <fstream>

#include "pv/core/error.hpp"
#include "pv/core/text.hpp"

using namespace pv::core;

TEST(CoreText, CountLines) {
    EXPECT_EQ(count_lines(""), 0);
    EXPECT_EQ(count_lines("a"), 1);
    EXPECT_EQ(count_lines("a\n"), 1);
    EXPECT_EQ(count_lines("a\nb"), 2);
    EXPECT_EQ(count_lines("a\n\nb\n"), 3);
}

TEST(CoreText, ReadFileAndLineRange) {
    const auto path = std::filesystem::temp_directory_path() / "pv_core_text_test.txt";
    {
        std::ofstream out(path, std::ios::binary);
        out << "l1\r\nl2\nl3\n";
    }
    const std::string text = read_file_text(path.string());
    EXPECT_EQ(text, "l1\r\nl2\nl3\n");
    EXPECT_EQ(count_lines(text), 3);
    EXPECT_EQ(line_range(text, 2, 3), "l2\nl3");
    EXPECT_EQ(line_range(text, 3, 99), "l3");
    EXPECT_EQ(line_range(text, 5, 6), "");
    std::filesystem::remove(path);
}

TEST(CoreText, ReadMissingFileThrows) {
    try {
        read_file_text("definitely/not/here.txt");
        FAIL() << "expected PvError";
    } catch (const PvError& e) {
        EXPECT_EQ(e.code(), err::Io);
    }
}

TEST(CoreText, Split) {
    EXPECT_EQ(split("a,,b", ','), (std::vector<std::string>{"a", "", "b"}));
    EXPECT_EQ(split("", ','), (std::vector<std::string>{""}));
}

TEST(CoreText, Join) {
    EXPECT_EQ(join({"a", "b", "c"}, "."), "a.b.c");
    EXPECT_EQ(join({}, "."), "");
}

TEST(CoreText, TrimAndLower) {
    EXPECT_EQ(trim("  x \n"), "x");
    EXPECT_EQ(to_lower("AbC"), "abc");
}

TEST(CoreText, ContainsAndSubsequence) {
    EXPECT_TRUE(contains_ci("UserService", "service"));
    EXPECT_TRUE(contains_ci("UserService", ""));
    EXPECT_TRUE(is_subsequence_ci("usv", "UserService"));
    EXPECT_FALSE(is_subsequence_ci("xyz", "UserService"));
}
