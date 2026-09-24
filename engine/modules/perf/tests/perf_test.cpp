#include <gtest/gtest.h>

#include <chrono>
#include <cstdlib>
#include <filesystem>
#include <iostream>

#include "gen_project.hpp"
#include "pv/graph/level_view.hpp"
#include "pv/impact/impact.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;
using Clock = std::chrono::steady_clock;

namespace {

double ms_since(Clock::time_point start) {
    return std::chrono::duration<double, std::milli>(Clock::now() - start).count();
}

// One generated project shared by all perf tests (1,000 files × 5 functions).
struct PerfProject {
    std::filesystem::path root = std::filesystem::temp_directory_path() / "pv_perf_project";
    session::TestEnv env{std::make_unique<lang_python::PythonAdapter>()};
    std::string id;
    double open_ms = 0;
    PerfProject() {
        std::filesystem::remove_all(root);
        perf::testing::generate_python_project(root.generic_string(), 1000, 5);
        const auto start = Clock::now();
        id = env.open_and_wait(root.generic_string());
        open_ms = ms_since(start);
    }
    ~PerfProject() {
        std::error_code ec;
        std::filesystem::remove_all(root, ec);
    }
};

PerfProject& project() {
    static PerfProject instance;
    return instance;
}

}  // namespace

TEST(EnginePerf, OpenThousandFiles) {
    if (!std::getenv("PV_RUN_PERF")) GTEST_SKIP() << "set PV_RUN_PERF=1";
    const double ms = project().open_ms;
    std::cout << "OpenThousandFiles: " << ms << " ms\n";
    EXPECT_LT(ms, 10000.0);
}

TEST(EnginePerf, LevelViewFast) {
    if (!std::getenv("PV_RUN_PERF")) GTEST_SKIP() << "set PV_RUN_PERF=1";
    const auto p = project().env.projects->get_ready(project().id);
    const double ms = p->read([](const graph::Graph& g) {
        const auto start = Clock::now();
        const graph::LevelView view = graph::build_level_view(g, "package:pkg_0");
        EXPECT_EQ(view.nodes.size(), 51u);  // 50 modules + __init__.py
        return ms_since(start);
    });
    std::cout << "LevelViewFast: " << ms << " ms\n";
    EXPECT_LT(ms, 200.0);
}

TEST(EnginePerf, ImpactFast) {
    if (!std::getenv("PV_RUN_PERF")) GTEST_SKIP() << "set PV_RUN_PERF=1";
    const auto p = project().env.projects->get_ready(project().id);
    const double ms = p->read([](const graph::Graph& g) {
        const auto start = Clock::now();
        const impact::ImpactResult r = impact::analyze_impact(g, "function:pkg_0/mod_0.py#f0", 5);
        EXPECT_FALSE(r.affected.empty());
        return ms_since(start);
    });
    std::cout << "ImpactFast: " << ms << " ms\n";
    EXPECT_LT(ms, 300.0);
}
