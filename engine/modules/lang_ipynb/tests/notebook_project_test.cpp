#include <gtest/gtest.h>

#include "pv/core/ids.hpp"
#include "pv/lang_ipynb/notebook_adapter.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

TEST(IpynbProject, NotebookLinksToModules) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    env.adapters.add(std::make_unique<lang_ipynb::NotebookAdapter>());
    const std::string id = env.open_and_wait(std::string(PV_TEST_FIXTURES) + "/pyproj_notebook");
    env.projects->get_ready(id)->read([](const graph::Graph& g) {
        EXPECT_NE(g.find_node("function:analysis.ipynb#summarize"), nullptr);
        EXPECT_NE(g.find_edge(core::make_edge_id(core::EdgeKind::Calls, "function:analysis.ipynb#summarize",
                                                 "function:app/utils.py#normalize")),
                  nullptr);
        EXPECT_NE(g.find_edge(core::make_edge_id(core::EdgeKind::Calls, "module:analysis.ipynb",
                                                 "function:analysis.ipynb#summarize")),
                  nullptr);
        EXPECT_EQ(g.node("module:analysis.ipynb").language, "python");
        return 0;
    });
}
