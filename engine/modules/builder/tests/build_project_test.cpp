#include <gtest/gtest.h>

#include "fixture_util.hpp"

using namespace pv;
using namespace pv::builder;

TEST(BuilderBuildProject, Fixture) {
    parse::AdapterRegistry adapters;
    adapters.add(std::make_unique<lang_python::PythonAdapter>());
    std::vector<std::string> phases;
    int progress_calls = 0;
    const BuildResult r = build_project(
        adapters, pv::builder::testing::fixture_root(), pv::builder::testing::fixture_files(),
        [&](int, int) { ++progress_calls; }, [&](const std::string& p) { phases.push_back(p); }, 2);
    EXPECT_EQ(r.files_parsed, 8);
    EXPECT_EQ(r.files_failed, 0);
    EXPECT_EQ(progress_calls, 8);
    EXPECT_EQ(r.main_guard_files, (std::vector<std::string>{"main.py"}));
    EXPECT_EQ(r.syntax_error_files, (std::vector<std::string>{"broken.py"}));
    EXPECT_EQ(phases, (std::vector<std::string>{"parsing", "linking"}));
}
