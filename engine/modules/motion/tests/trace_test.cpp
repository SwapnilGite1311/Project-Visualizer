#include <gtest/gtest.h>

#include <filesystem>
#include <fstream>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/motion/trace.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

namespace {

std::string write_trace(const std::string& name, const std::vector<std::string>& lines) {
    const std::filesystem::path path = std::filesystem::temp_directory_path() / name;
    std::ofstream out(path, std::ios::binary);
    for (const std::string& l : lines) out << l << "\n";
    return path.generic_string();
}

std::string ev(const std::string& kind, const std::string& file, int line, const std::string& func, int depth,
               const std::string& extra = "") {
    return R"({"v":1,"seq":0,"kind":")" + kind + R"(","file":")" + file + R"(","line":)" + std::to_string(line) +
           R"(,"func":")" + func + R"(","depth":)" + std::to_string(depth) + R"(,"t_ns":0)" + extra + "}";
}

std::vector<std::string> sample_lines() {
    return {
        R"({"v":1,"seq":0,"kind":"start","file":"","line":0,"func":"","depth":0,"t_ns":0,"argv":["main.py"]})",
        ev("call", "main.py", 7, "main", 0),
        ev("line", "main.py", 8, "main", 0),
        ev("call", "app/services.py", 8, "UserService.get_user", 1, R"(,"locals":{"user_id":"1"})"),
        ev("line", "app/services.py", 9, "UserService.get_user", 1),
        ev("exception", "app/services.py", 10, "UserService.get_user", 1, R"(,"value":"ValueError: bad id")"),
        ev("return", "app/services.py", 10, "UserService.get_user", 1, R"(,"value":"None")"),
        "not json",
        R"({"v":1,"kind":"weird"})",
        ev("call", "outside.py", 1, "x", 0),
        R"({"v":1,"seq":10,"kind":"end","file":"","line":0,"func":"","depth":0,"t_ns":9,"exit_code":1,"truncated":false})",
    };
}

struct Fixture {
    session::TestEnv env{std::make_unique<lang_python::PythonAdapter>()};
    std::shared_ptr<session::Project> project;
    Fixture() { project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path())); }
    motion::LoadedTrace load(const std::string& path, std::size_t max_steps = 500000) {
        return project->read([&](const graph::Graph& g) { return motion::load_trace_file(g, path, max_steps); });
    }
};

}  // namespace

TEST(MotionTrace, LoadsAndMapsSteps) {
    Fixture f;
    const auto t = f.load(write_trace("pv_motion_trace_test.jsonl", sample_lines()));
    ASSERT_EQ(t.steps.size(), 7u);
    EXPECT_EQ(t.skipped_lines, 2);
    EXPECT_EQ(t.steps[0].node_id, "function:main.py#main");
    EXPECT_EQ(t.steps[1].node_id, "function:main.py#main");
    EXPECT_EQ(t.steps[2].node_id, "method:app/services.py#UserService.get_user");
    EXPECT_EQ(t.steps[2].locals["user_id"], "1");
    EXPECT_EQ(t.steps[4].value, "ValueError: bad id");
    EXPECT_EQ(t.steps[6].node_id, "");
    EXPECT_EQ(t.steps[6].i, 6);
    EXPECT_EQ(t.argv, std::vector<std::string>{"main.py"});
    ASSERT_TRUE(t.exit_code.has_value());
    EXPECT_EQ(*t.exit_code, 1);
    EXPECT_FALSE(t.truncated);

    const auto counts = motion::function_counts(t);
    ASSERT_EQ(counts.size(), 2u);
    EXPECT_EQ(counts[0].node_id, "function:main.py#main");
    EXPECT_EQ(counts[0].calls, 1);
    EXPECT_EQ(counts[1].node_id, "method:app/services.py#UserService.get_user");

    const motion::Step* ex = motion::last_exception(t);
    ASSERT_NE(ex, nullptr);
    EXPECT_EQ(ex->i, 4);
}

TEST(MotionTrace, LinesBelongToTheirFrame) {
    Fixture f;
    const auto t = f.load(write_trace("pv_motion_trace_frames.jsonl",
                                      {ev("call", "app/models.py", 4, "Base", 0), ev("line", "app/models.py", 5, "Base", 0),
                                       ev("return", "app/models.py", 5, "Base", 0, R"(,"value":"None")"),
                                       ev("call", "app/models.py", 5, "Base.save", 0),
                                       ev("exception", "main.py", 15, "<module>", 0, R"(,"value":"SystemExit: 0")")}));
    ASSERT_EQ(t.steps.size(), 5u);
    EXPECT_EQ(t.steps[0].node_id, "class:app/models.py#Base");
    EXPECT_EQ(t.steps[1].node_id, "class:app/models.py#Base");
    EXPECT_EQ(t.steps[2].node_id, "class:app/models.py#Base");
    EXPECT_EQ(t.steps[3].node_id, "method:app/models.py#Base.save");
    EXPECT_EQ(motion::last_exception(t), nullptr);
}

TEST(MotionTrace, MaxSteps) {
    Fixture f;
    const auto t = f.load(write_trace("pv_motion_trace_max.jsonl", sample_lines()), 3);
    EXPECT_EQ(t.steps.size(), 3u);
    EXPECT_TRUE(t.truncated);
}

TEST(MotionTrace, Store) {
    motion::TraceStore store;
    EXPECT_EQ(store.add({}), "t1");
    EXPECT_EQ(store.add({}), "t2");
    store.add({});
    store.add({});
    EXPECT_EQ(store.get("t1"), nullptr);
    EXPECT_NE(store.get("t2"), nullptr);
    EXPECT_TRUE(store.remove("t2"));
    EXPECT_FALSE(store.remove("t2"));
}
