#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/core/json.hpp"

using namespace pv::core;

namespace {

const char* kNodeJson = R"({
  "id": "function:src/app/main.py#run",
  "kind": "function",
  "name": "run",
  "qualified_name": "app.main.run",
  "file_path": "src/app/main.py",
  "language": "python",
  "span": {"start_line": 3, "start_col": 0, "end_line": 9, "end_col": 12},
  "level": 4,
  "parent_id": "module:src/app/main.py",
  "metrics": {"loc": 7, "complexity": 2, "fan_in": 1, "fan_out": 3},
  "health": "unknown"
})";

Node example_node() {
    Node n;
    n.id = "function:src/app/main.py#run";
    n.kind = NodeKind::Function;
    n.name = "run";
    n.qualified_name = "app.main.run";
    n.file_path = "src/app/main.py";
    n.language = "python";
    n.span = Span{3, 0, 9, 12};
    n.level = 4;
    n.parent_id = "module:src/app/main.py";
    n.metrics = Metrics{7, 2, 1, 3};
    n.health = Health::Unknown;
    return n;
}

}  // namespace

TEST(CoreJson, NodeMatchesContractExample) {
    EXPECT_EQ(Json(example_node()), Json::parse(kNodeJson));
}

TEST(CoreJson, NodeRoundTrip) {
    const Node back = Json(example_node()).get<Node>();
    EXPECT_EQ(back.id, "function:src/app/main.py#run");
    EXPECT_EQ(back.kind, NodeKind::Function);
    EXPECT_EQ(back.span.end_line, 9);
    EXPECT_EQ(back.metrics.fan_out, 3);
}

TEST(CoreJson, EdgeMatchesContractExample) {
    Edge e;
    e.id = "calls|function:src/a.py#f|function:src/b.py#g";
    e.kind = EdgeKind::Calls;
    e.source_id = "function:src/a.py#f";
    e.target_id = "function:src/b.py#g";
    e.weight = 2;
    e.resolved = true;
    const Json expected = Json::parse(R"({"id": "calls|function:src/a.py#f|function:src/b.py#g", "kind": "calls",
 "source_id": "function:src/a.py#f", "target_id": "function:src/b.py#g",
 "weight": 2, "resolved": true})");
    EXPECT_EQ(Json(e), expected);
    EXPECT_EQ(expected.get<Edge>().weight, 2);
}

TEST(CoreJson, EdgeUnknownKindThrows) {
    const Json j = Json::parse(R"({"id":"x","kind":"pizza","source_id":"a","target_id":"b","weight":1,"resolved":true})");
    EXPECT_THROW(j.get<Edge>(), PvError);
}

TEST(CoreJson, NodeUnknownKindThrows) {
    Json j = Json::parse(kNodeJson);
    j["kind"] = "banana";
    EXPECT_THROW(j.get<Node>(), PvError);
}

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
