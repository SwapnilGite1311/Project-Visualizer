#include <gtest/gtest.h>

#include "pv/errmap/errmap.hpp"
#include "pv/grounding/grounding.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

namespace {

std::string python_trace(const std::string& root) {
    return "Traceback (most recent call last):\n"
           "  File \"" + root + "/main.py\", line 9, in main\n"
           "    user = service.get_user(1)\n"
           "  File \"" + root + "/app/services.py\", line 9, in get_user\n"
           "    if not is_valid(user_id):\n"
           "  File \"" + root + "/app/utils.py\", line 9, in is_valid\n"
           "    return user_id > 0\n"
           "  File \"/usr/lib/python3.12/json/__init__.py\", line 1, in loads\n"
           "ValueError: bad id\n";
}

}  // namespace

TEST(GroundingErrorPack, OriginFramesSnippetsAndHealth) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const std::string root = session::pyproj_small_path();
    const auto project = env.projects->get_ready(env.open_and_wait(root));
    project->read([&](const graph::Graph& g) {
        errmap::ParsedTrace parsed = errmap::parse_any(python_trace(root));
        errmap::map_frames(parsed, g, root);
        errmap::ErrorRecord record;
        record.error_id = "e1";
        record.source = "pasted";
        record.language = parsed.language;
        record.error_type = parsed.error_type;
        record.message = parsed.message;
        record.frames = parsed.frames;
        for (const auto& f : parsed.frames) {  // like the error store: the innermost frame in the project
            if (f.in_project && !f.node_id.empty()) record.origin_node_id = f.node_id;
        }
        ASSERT_EQ(record.origin_node_id, "function:app/utils.py#is_valid");

        health::HealthInfo failing;
        failing.state = core::Health::Error;
        failing.calls = 4;
        failing.errors = 4;
        const auto pack = grounding::build_error_pack(g, root, record, {{"function:app/utils.py#is_valid", failing}, {"module:other.py", failing}});

        EXPECT_EQ(pack["kind"], "error");
        EXPECT_EQ(pack["error"]["error_type"], "ValueError");
        EXPECT_EQ(pack["origin"]["node"]["id"], "function:app/utils.py#is_valid");
        ASSERT_EQ(pack["frames"].size(), 3u);  // the library frame is left out
        bool has_def = false;
        for (const auto& f : pack["frames"]) {
            if (!f["snippet"].is_null() && f["snippet"]["text"].get<std::string>().find("def is_valid") != std::string::npos) has_def = true;
        }
        EXPECT_TRUE(has_def);
        EXPECT_EQ(pack["health"].size(), 1u);
        EXPECT_EQ(pack["health"]["function:app/utils.py#is_valid"]["state"], "error");
        const auto& related = pack["related_node_ids"];
        EXPECT_NE(std::find(related.begin(), related.end(), "function:app/utils.py#is_valid"), related.end());
        EXPECT_TRUE(std::is_sorted(related.begin(), related.end()));
        EXPECT_GT(pack["approx_tokens"].get<int>(), 0);

        record.origin_node_id = "";
        EXPECT_TRUE(grounding::build_error_pack(g, root, record, {})["origin"].is_null());
    });
}

TEST(GroundingErrorPack, CheckCitations) {
    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    const auto project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));
    project->read([](const graph::Graph& g) {
        const auto r = grounding::check_citations(g, {"function:app/utils.py#is_valid", "function:app/made_up.py#x"});
        EXPECT_EQ(r["valid"], (nlohmann::json{"function:app/utils.py#is_valid"}));
        EXPECT_EQ(r["invalid"], (nlohmann::json{"function:app/made_up.py#x"}));
        return 0;
    });
}
