#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/core/text.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/source.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;
using namespace pv::session;

TEST(SessionSource, NodeSources) {
    TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const std::string id = env.open_and_wait(pyproj_small_path());
    const auto project = env.projects->get_ready(id);
    const std::string root = project->root_path();
    project->read([&](const graph::Graph& g) {
        EXPECT_EQ(source_text_for(root, g.node("method:app/services.py#UserService.format_user")),
                  "    def format_user(self, user):\n        return utils.normalize(user.display())");
        EXPECT_EQ(core::count_lines(source_text_for(root, g.node("module:app/utils.py"))), 9);
        try {
            source_text_for(root, g.node("package:app"));
            ADD_FAILURE() << "expected Unsupported";
        } catch (const core::PvError& e) {
            EXPECT_EQ(e.code(), core::err::Unsupported);
        }
        return 0;
    });
}
