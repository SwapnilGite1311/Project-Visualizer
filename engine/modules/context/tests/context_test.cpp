#include <gtest/gtest.h>

#include "pv/context/context.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;
using Json = nlohmann::json;

namespace {

struct Fixture {
    session::TestEnv env{std::make_unique<lang_python::PythonAdapter>()};
    std::shared_ptr<session::Project> project;
    Fixture() { project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path())); }
    Json pack(const std::string& id, int max_chars = 12000) {
        return project->read(
            [&](const graph::Graph& g) { return context::build_context_pack(g, project->root_path(), id, max_chars); });
    }
};

std::vector<std::string> ids(const Json& list) {
    std::vector<std::string> out;
    for (const Json& item : list) out.push_back(item["id"]);
    return out;
}

}  // namespace

TEST(ContextPack, MethodPack) {
    Fixture f;
    const Json p = f.pack("method:app/services.py#UserService.get_user");
    EXPECT_TRUE(p["callers"].empty());
    EXPECT_EQ(ids(p["callees"]),
              (std::vector<std::string>{"class:app/models.py#User", "function:app/utils.py#is_valid",
                                        "function:app/utils.py#normalize",
                                        "method:app/services.py#UserService.format_user"}));
    EXPECT_EQ(p["callees"][0]["file_path"], "app/models.py");
    EXPECT_EQ(p["parent"]["id"], "class:app/services.py#UserService");
    EXPECT_EQ(p["source"].get<std::string>().rfind("    def get_user(self, user_id):", 0), 0u);
    EXPECT_GT(p["approx_tokens"], 0);
    EXPECT_FALSE(p["source_truncated"]);
}

TEST(ContextPack, ModulePack) {
    Fixture f;
    const Json p = f.pack("module:app/services.py");
    EXPECT_EQ(p["imports"].size(), 4u);
    EXPECT_EQ(ids(p["children"]), (std::vector<std::string>{"class:app/services.py#UserService"}));
}

TEST(ContextPack, TruncationAndProject) {
    Fixture f;
    const Json small = f.pack("module:app/models.py", 10);
    EXPECT_EQ(small["source"].get<std::string>().size(), 10u);
    EXPECT_TRUE(small["source_truncated"]);
    const Json root = f.pack("project:");
    EXPECT_TRUE(root["parent"].is_null());
    EXPECT_EQ(root["source"], "");
}
