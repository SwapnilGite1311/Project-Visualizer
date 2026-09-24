#include <gtest/gtest.h>

#include <sstream>

#include "pv/cli/commands.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

TEST(CliStats, PrintsCounts) {
    parse::AdapterRegistry adapters;
    adapters.add(std::make_unique<lang_python::PythonAdapter>());
    std::ostringstream out;
    std::ostringstream err;
    EXPECT_EQ(cli::run_stats({session::pyproj_small_path()}, adapters, out, err), 0) << err.str();
    const std::string text = out.str();
    EXPECT_NE(text.find("project: 1\n"), std::string::npos);
    EXPECT_NE(text.find("module: 8\n"), std::string::npos);
    EXPECT_NE(text.find("edges: 19\n"), std::string::npos);
    EXPECT_NE(text.find("errors: 0\n"), std::string::npos);
    EXPECT_EQ(cli::run_stats({}, adapters, out, err), 2);
}
