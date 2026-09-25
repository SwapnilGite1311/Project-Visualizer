#include <gtest/gtest.h>

#include "pv/errmap/errmap.hpp"
#include "samples.hpp"

using namespace pv;

TEST(ErrmapPython, ParsesTracebacks) {
    const auto t = errmap::parse_python(errmap::testing::python_trace("C:/code/demo"));
    ASSERT_TRUE(t.has_value());
    EXPECT_EQ(t->language, "python");
    EXPECT_EQ(t->error_type, "ValueError");
    EXPECT_EQ(t->message, "bad id");
    ASSERT_EQ(t->frames.size(), 3u);
    EXPECT_EQ(t->frames[0].file_path, "C:/code/demo/main.py");
    EXPECT_EQ(t->frames[0].line, 9);
    EXPECT_EQ(t->frames[0].function, "main");
    EXPECT_FALSE(t->frames[0].is_origin);
    EXPECT_TRUE(t->frames[2].is_origin);
    EXPECT_EQ(t->frames[2].function, "is_valid");
}

TEST(ErrmapPython, ChainedAndBareExceptions) {
    const std::string chained =
        "Traceback (most recent call last):\n  File \"a.py\", line 1, in f\nKeyError: 'x'\n\n"
        "During handling of the above exception, another exception occurred:\n\n"
        "Traceback (most recent call last):\n  File \"b.py\", line 5, in g\n  File \"c.py\", line 7, in h\nRuntimeError\n";
    const auto t = errmap::parse_python(chained);
    ASSERT_TRUE(t.has_value());
    EXPECT_EQ(t->error_type, "RuntimeError");
    EXPECT_EQ(t->message, "");
    ASSERT_EQ(t->frames.size(), 2u);
    EXPECT_EQ(t->frames[1].file_path, "c.py");
    EXPECT_FALSE(errmap::parse_python("ValueError: no header here").has_value());
}
