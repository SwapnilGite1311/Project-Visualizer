#include <gtest/gtest.h>

#include <functional>

#include "pv/core/error.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_graphapi(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;

namespace {

struct GraphApiEnv {
    session::TestEnv env{std::make_unique<lang_python::PythonAdapter>()};
    std::string pid;
    GraphApiEnv() {
        pv_register_graphapi(*env.reg);
        pid = env.open_and_wait(session::pyproj_small_path());
    }
    Json call(const std::string& method, Json params) {
        params["project_id"] = pid;
        return env.call(method, params);
    }
};

int error_code(const std::function<void()>& fn) {
    try {
        fn();
    } catch (const core::PvError& e) {
        return e.code();
    }
    return 0;
}

const Json* find_edge(const Json& edges, const std::string& id) {
    for (const Json& e : edges) {
        if (e["id"] == id) return &e;
    }
    return nullptr;
}

}  // namespace

TEST(GraphApi, NodeAndChildren) {
    GraphApiEnv t;
    const Json user = t.call("graph.node", Json{{"node_id", "class:app/models.py#User"}});
    EXPECT_EQ(user["kind"], "class");
    EXPECT_EQ(user["qualified_name"], "app.models.User");
    EXPECT_EQ(error_code([&] { t.call("graph.node", Json{{"node_id", "class:nope.py#X"}}); }), core::err::NodeNotFound);
    EXPECT_EQ(t.call("graph.children", Json{{"node_id", "package:app"}})["nodes"].size(), 5u);
}

TEST(GraphApi, LevelView) {
    GraphApiEnv t;
    const Json root = t.call("graph.level_view", Json::object());
    EXPECT_EQ(root["parent"]["id"], "project:");
    EXPECT_EQ(root["nodes"].size(), 4u);
    ASSERT_EQ(root["edges"].size(), 4u);
    for (const char* id : {"agg|calls|module:main.py|package:app", "agg|imports|module:main.py|package:app",
                           "agg|calls|module:main.py|external:sys", "agg|imports|module:main.py|external:sys"}) {
        const Json* e = find_edge(root["edges"], id);
        ASSERT_NE(e, nullptr) << id;
        EXPECT_EQ((*e)["weight"], 1) << id;
    }
    const Json app = t.call("graph.level_view", Json{{"parent_id", "package:app"}});
    EXPECT_EQ(app["nodes"].size(), 5u);
    EXPECT_EQ(app["edges"].size(), 8u);
    EXPECT_EQ((*find_edge(app["edges"], "agg|imports|module:app/services.py|module:app/utils.py"))["weight"], 3);
    EXPECT_EQ((*find_edge(app["edges"], "agg|calls|module:app/services.py|module:app/utils.py"))["weight"], 3);
}

TEST(GraphApi, Edges) {
    GraphApiEnv t;
    const std::string id = "function:app/utils.py#is_valid";
    EXPECT_EQ(t.call("graph.edges", Json{{"node_id", id}, {"direction", "in"}})["edges"].size(), 3u);
    EXPECT_EQ(t.call("graph.edges", Json{{"node_id", id}, {"direction", "in"}, {"kinds", {"calls"}}})["edges"].size(),
              2u);
    EXPECT_EQ(t.call("graph.edges", Json{{"node_id", id}, {"direction", "out"}})["edges"].size(), 0u);
    EXPECT_EQ(error_code([&] { t.call("graph.edges", Json{{"node_id", id}, {"direction", "sideways"}}); }),
              core::err::InvalidParams);
}

TEST(GraphApi, Source) {
    GraphApiEnv t;
    const Json src = t.call("graph.source", Json{{"node_id", "function:app/utils.py#normalize"}});
    EXPECT_EQ(src["text"], "def normalize(name):\n    return name.strip().lower()");
    EXPECT_EQ(src["span"]["start_line"], 4);
    EXPECT_EQ(src["language"], "python");
    EXPECT_EQ(error_code([&] { t.call("graph.source", Json{{"node_id", "package:app"}}); }), core::err::Unsupported);
}

TEST(GraphApi, Ancestors) {
    GraphApiEnv t;
    const Json nodes = t.call("graph.ancestors", Json{{"node_id", "method:app/models.py#User.display"}})["nodes"];
    std::vector<std::string> ids;
    for (const Json& n : nodes) ids.push_back(n["id"]);
    EXPECT_EQ(ids, (std::vector<std::string>{"project:", "package:app", "module:app/models.py",
                                             "class:app/models.py#User", "method:app/models.py#User.display"}));
}
