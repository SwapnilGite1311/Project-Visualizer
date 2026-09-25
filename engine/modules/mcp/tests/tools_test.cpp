#include <gtest/gtest.h>

#include <algorithm>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/mcp/mcp.hpp"
#include "pv/rpc/notifier.hpp"
#include "pv/session/project_manager.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;
using Json = nlohmann::json;

class McpTools : public ::testing::Test {
protected:
    parse::AdapterRegistry adapters;
    rpc::NullNotifier notifier;
    std::unique_ptr<session::ProjectManager> projects;
    std::vector<mcp::Tool> tools;

    void SetUp() override {
        adapters.add(std::make_unique<lang_python::PythonAdapter>());
        projects = std::make_unique<session::ProjectManager>(adapters, notifier);
        const std::string id = projects->open(session::pyproj_small_path(), {});
        ASSERT_TRUE(projects->wait_until_settled(id, 20000));
        tools = mcp::make_tools(*projects->get_ready(id));
    }

    Json call(const std::string& name, const Json& args) {
        const auto t = std::find_if(tools.begin(), tools.end(), [&](const mcp::Tool& x) { return x.name == name; });
        if (t == tools.end()) throw std::runtime_error("no tool " + name);
        return t->fn(args);
    }
};

TEST_F(McpTools, EveryToolHasASchemaAndADescription) {
    std::vector<std::string> names;
    for (const auto& t : tools) {
        names.push_back(t.name);
        EXPECT_EQ(t.input_schema["type"], "object") << t.name;
        EXPECT_TRUE(t.input_schema["properties"].is_object()) << t.name;
        EXPECT_GT(t.description.size(), 30u) << t.name;
    }
    EXPECT_EQ(names, (std::vector<std::string>{"pv_overview", "pv_search", "pv_node", "pv_dependencies", "pv_impact", "pv_path"}));
}

TEST_F(McpTools, AnswerTheQuestionsAnAgentAsks) {
    EXPECT_NE(call("pv_overview", Json::object())["digest"].get<std::string>().find("UserService"), std::string::npos);

    const Json hits = call("pv_search", {{"query", "is_valid"}, {"kinds", {"function"}}});
    ASSERT_FALSE(hits["results"].empty());
    EXPECT_EQ(hits["results"][0]["node_id"], "function:app/utils.py#is_valid");
    EXPECT_THROW(call("pv_search", {{"query", "x"}, {"kinds", {"galaxy"}}}), std::exception);

    const Json by_name = call("pv_node", {{"name", "UserService"}});
    EXPECT_EQ(by_name["node"]["id"], "class:app/services.py#UserService");
    EXPECT_NE(by_name["source"].get<std::string>().find("class UserService"), std::string::npos);
    const Json by_id = call("pv_node", {{"node_id", "function:app/utils.py#is_valid"}});
    EXPECT_FALSE(by_id["callers"].empty());

    const Json used_by = call("pv_dependencies", {{"node_id", "function:app/utils.py#is_valid"}, {"direction", "in"}});
    EXPECT_FALSE(used_by["items"].empty());
    EXPECT_THROW(call("pv_dependencies", {{"node_id", "function:app/utils.py#is_valid"}, {"direction", "sideways"}}), std::exception);

    const Json impact = call("pv_impact", {{"node_id", "class:app/services.py#UserService"}, {"change_kind", "rename"}});
    EXPECT_EQ(impact["risk"]["level"], "medium");
    EXPECT_EQ(impact["change_kind"], "rename");
    EXPECT_THROW(call("pv_impact", {{"node_id", "function:nope.py#x"}}), std::exception);

    const Json path = call("pv_path", {{"from_id", "module:main.py"}, {"to_id", "function:app/utils.py#is_valid"}});
    EXPECT_TRUE(path.contains("found"));
    EXPECT_THROW(call("pv_path", {{"from_id", "module:main.py"}}), std::exception);
}
