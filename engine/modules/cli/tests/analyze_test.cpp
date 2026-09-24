#include <gtest/gtest.h>

#include <filesystem>
#include <fstream>
#include <sstream>

#include "pv/cli/commands.hpp"
#include "pv/core/json.hpp"
#include "pv/core/text.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

namespace {

parse::AdapterRegistry python_only() {
    parse::AdapterRegistry adapters;
    adapters.add(std::make_unique<lang_python::PythonAdapter>());
    return adapters;
}

}  // namespace

TEST(CliAnalyze, WritesTheGraph) {
    const auto adapters = python_only();
    const auto file = std::filesystem::temp_directory_path() / "pv_cli_analyze.json";
    std::ostringstream out;
    std::ostringstream err;
    EXPECT_EQ(cli::run_analyze({session::pyproj_small_path(), "--out", file.generic_string()}, adapters, out, err), 0) << err.str();
    const core::Json j = core::Json::parse(core::read_file_text(file.generic_string()));
    EXPECT_EQ(j["nodes"].size(), 25u);
    EXPECT_EQ(j["edges"].size(), 19u);
    EXPECT_EQ(j["engine_version"], "0.1.0");
    EXPECT_EQ(j["syntax_error_files"], (core::Json{"broken.py"}));
    std::filesystem::remove(file);
}

TEST(CliAnalyze, UsageAndLoadErrors) {
    const auto adapters = python_only();
    std::ostringstream out;
    std::ostringstream err;
    EXPECT_EQ(cli::run_analyze({}, adapters, out, err), 2);
    EXPECT_NE(err.str().find("usage: pv-engine analyze"), std::string::npos);
    EXPECT_EQ(cli::run_analyze({"x", "--bogus"}, adapters, out, err), 2);
    EXPECT_EQ(cli::run_analyze({"C:/definitely/not/here"}, adapters, out, err), 1);
    EXPECT_NE(err.str().find("folder not found"), std::string::npos);
}
