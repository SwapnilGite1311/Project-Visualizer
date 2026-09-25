#include <gtest/gtest.h>

#include <chrono>
#include <filesystem>
#include <fstream>
#include <random>

#include "pv/core/paths.hpp"
#include "pv/errmap/store.hpp"
#include "pv/fixsync/fixsync.hpp"
#include "pv/incremental/incremental.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_runtime(pv::session::Registry& reg);
void pv_register_errmap(pv::session::Registry& reg);
void pv_register_fixsync(pv::session::Registry& reg);

using namespace pv;
using rpc::Json;
namespace stdfs = std::filesystem;

namespace {

stdfs::path to_path(const std::string& utf8) { return stdfs::path(std::u8string(reinterpret_cast<const char8_t*>(utf8.data()), utf8.size())); }

std::string from_path(const stdfs::path& p) {
    const std::u8string s = p.generic_u8string();
    return std::string(reinterpret_cast<const char*>(s.data()), s.size());
}

int64_t now_ns() {
    return std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
}

Json ok_call(const std::string& span) {
    return Json{{"v", 1},         {"event_id", "ok-" + span}, {"trace_id", "t" + span}, {"span_id", span},    {"kind", "call"},
                {"name", "is_valid"}, {"start_ns", now_ns()},  {"file_path", "app/utils.py"}, {"line", 9}, {"status", "ok"}};
}

void reset_all() {
    runtime::hub().reset_for_tests();
    errmap::store().reset_for_tests();
    incremental::manager().reset_for_tests();
    fixsync::tracker().reset_for_tests();
}

}  // namespace

TEST(FixsyncRpc, PastedErrorIsFixedAndConfirmedByRuntime) {
    reset_all();
    std::random_device rd;
    const stdfs::path dir = stdfs::temp_directory_path() / ("pv-fixsync-" + std::to_string(rd()));
    stdfs::copy(to_path(session::pyproj_small_path()), dir, stdfs::copy_options::recursive);
    {
        session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
        pv_register_runtime(*env.reg);
        pv_register_errmap(*env.reg);
        pv_register_fixsync(*env.reg);
        const std::string root = core::normalize_path(from_path(dir));
        const std::string pid = env.open_and_wait(root);
        const auto project = env.projects->get_ready(pid);

        const std::string trace = "Traceback (most recent call last):\n  File \"" + root +
                                  "/app/utils.py\", line 9, in is_valid\n    return bool(value)\nValueError: bad id\n";
        const Json pasted = env.call("errors.map_stack", {{"project_id", pid}, {"text", trace}});
        const std::string error_id = pasted["error_id"];
        EXPECT_TRUE(env.call("fixes.list", {{"project_id", pid}})["items"].empty());

        // The developer edits app/utils.py; live sync applies the change.
        std::ofstream(dir / "app" / "utils.py", std::ios::app) << "\n# fixed\n";
        incremental::manager().seed(*project, env.adapters);
        incremental::ChangeSet changes;
        changes.modified = {"app/utils.py"};
        incremental::manager().apply_changes(*project, env.adapters, env.notifier, changes);

        const Json pending = env.call("fixes.list", {{"project_id", pid}})["items"];
        ASSERT_EQ(pending.size(), 1u);
        EXPECT_EQ(pending[0]["error_id"], error_id);
        EXPECT_EQ(pending[0]["state"], "fix_pending");
        EXPECT_EQ(pending[0]["node_id"], "function:app/utils.py#is_valid");

        // The fixed function runs fine three times.
        env.call("runtime.ingest", {{"project_id", pid}, {"events", {ok_call("a"), ok_call("b")}}});
        EXPECT_EQ(env.call("fixes.list", {{"project_id", pid}})["items"][0]["state"], "fix_pending");
        env.call("runtime.ingest", {{"project_id", pid}, {"events", {ok_call("c")}}});
        const Json verified = env.call("fixes.list", {{"project_id", pid}})["items"];
        EXPECT_EQ(verified[0]["state"], "verified");
        EXPECT_EQ(verified[0]["ok_calls"], 3);
        const Json errors = env.call("errors.list", {{"project_id", pid}});  // keep the result alive while looping over it
        for (const Json& e : errors["errors"]) EXPECT_NE(e["error_id"], error_id);

        int notices = 0;
        for (const auto& [method, params] : env.notifier.items()) {
            if (method == "fixes.changed") ++notices;
        }
        EXPECT_GE(notices, 2);  // pending, then verified
        reset_all();
    }
    std::error_code ec;
    stdfs::remove_all(dir, ec);
}
