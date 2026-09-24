#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/search/search.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

TEST(SearchSuggest, Prefixes) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));
    project->read([](const graph::Graph& g) {
        EXPECT_EQ(search::suggest_names(g, "get", 10), (std::vector<std::string>{"get_user", "get_user_route"}));
        EXPECT_EQ(search::suggest_names(g, "no", 10), (std::vector<std::string>{"normalize"}));
        EXPECT_EQ(search::suggest_names(g, "get", 1).size(), 1u);
        return 0;
    });
}
