#include <gtest/gtest.h>

#include "pv/grounding/grounding.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

TEST(GroundingDigest, CompactOverviewOfTheProject) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));
    project->read([&](const graph::Graph& g) {
        const std::string digest = grounding::build_digest(g, project->main_guard_files(), 2000);
        EXPECT_LE(digest.size(), 2000u);
        EXPECT_EQ(digest.rfind("Project pyproj_small: ", 0), 0u) << digest;
        EXPECT_NE(digest.find("languages python"), std::string::npos) << digest;
        EXPECT_NE(digest.find("Entry points: "), std::string::npos);
        EXPECT_NE(digest.find("package app"), std::string::npos) << digest;
        EXPECT_NE(digest.find("UserService"), std::string::npos) << digest;
        EXPECT_NE(digest.find("External libraries: "), std::string::npos);
        EXPECT_NE(digest.find("sys"), std::string::npos) << digest;

        const std::string tiny = grounding::build_digest(g, project->main_guard_files(), 80);
        EXPECT_LE(tiny.size(), 80u);
        EXPECT_EQ(tiny.find('\n'), std::string::npos);  // whole lines only: just the first one fits
        EXPECT_FALSE(tiny.empty());
        return 0;
    });
}
