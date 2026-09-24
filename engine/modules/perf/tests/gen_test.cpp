#include <gtest/gtest.h>

#include <filesystem>

#include "gen_project.hpp"

TEST(PerfGen, GeneratesFiles) {
    namespace fs = std::filesystem;
    const fs::path root = fs::temp_directory_path() / "pv_perf_gen_test";
    fs::remove_all(root);
    pv::perf::testing::generate_python_project(root.generic_string(), 30, 3);
    int modules = 0;
    int inits = 0;
    for (const auto& entry : fs::recursive_directory_iterator(root)) {
        if (!entry.is_regular_file()) continue;
        if (entry.path().filename() == "__init__.py") ++inits;
        else if (entry.path().extension() == ".py") ++modules;
    }
    EXPECT_EQ(modules, 30);
    EXPECT_EQ(inits, 20);
    fs::remove_all(root);
}
