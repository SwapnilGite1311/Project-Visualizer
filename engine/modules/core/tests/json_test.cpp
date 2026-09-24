#include <gtest/gtest.h>

#include "pv/core/json.hpp"

using namespace pv::core;

TEST(CoreJson, SpanDump) {
    EXPECT_EQ(Json(Span{3, 0, 9, 12}).dump(), R"({"end_col":12,"end_line":9,"start_col":0,"start_line":3})");
}

TEST(CoreJson, SpanRoundTrip) {
    const Span back = Json(Span{3, 0, 9, 12}).get<Span>();
    EXPECT_EQ(back.start_line, 3);
    EXPECT_EQ(back.start_col, 0);
    EXPECT_EQ(back.end_line, 9);
    EXPECT_EQ(back.end_col, 12);
}

TEST(CoreJson, MetricsRoundTrip) {
    const Metrics back = Json(Metrics{7, 2, 1, 3}).get<Metrics>();
    EXPECT_EQ(back.loc, 7);
    EXPECT_EQ(back.complexity, 2);
    EXPECT_EQ(back.fan_in, 1);
    EXPECT_EQ(back.fan_out, 3);
}
