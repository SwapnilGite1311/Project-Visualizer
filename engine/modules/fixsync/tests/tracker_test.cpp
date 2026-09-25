#include <gtest/gtest.h>

#include "pv/fixsync/fixsync.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

namespace {

constexpr int64_t kSavedAt = 1'000'000;  // ms

errmap::ErrorRecord record(const std::string& id, const std::string& node) {
    errmap::ErrorRecord r;
    r.error_id = id;
    r.source = "runtime";
    r.error_type = "ValueError";
    r.message = "bad id";
    r.origin_node_id = node;
    return r;
}

runtime::MappedEvent call(const std::string& node, int64_t at_ms, bool error = false, const std::string& message = "bad id") {
    runtime::MappedEvent m;
    m.node_id = node;
    m.ev.kind = "call";
    m.ev.name = "is_valid";
    m.ev.start_ns = at_ms * 1000000;
    m.ev.status = error ? "error" : "ok";
    if (error) m.ev.error = runtime::EventError{"ValueError", message, ""};
    return m;
}

const std::string kNode = "function:app/utils.py#is_valid";

}  // namespace

class FixTracker : public ::testing::Test {
protected:
    void SetUp() override { fixsync::tracker().reset_for_tests(); }
    void TearDown() override { fixsync::tracker().reset_for_tests(); }
    session::TestEnv env{std::make_unique<lang_python::PythonAdapter>()};
    std::shared_ptr<session::Project> project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path()));

    std::vector<fixsync::FixItem> save(const std::vector<std::string>& files) {
        return project->read([&](const graph::Graph& g) {
            return fixsync::tracker().on_files_changed("p1", {record("e1", kNode), record("e2", "function:app/models.py#User.save")},
                                                       files, g, kSavedAt);
        });
    }
};

TEST_F(FixTracker, PendingThenVerifiedAfterThreeGoodCalls) {
    EXPECT_TRUE(save({"main.py"}).empty());  // not the file with the error
    const auto pending = save({"app/utils.py"});
    ASSERT_EQ(pending.size(), 1u);
    EXPECT_EQ(pending[0].error_id, "e1");
    EXPECT_EQ(pending[0].state, fixsync::FixState::FixPending);
    EXPECT_EQ(pending[0].file_path, "app/utils.py");
    EXPECT_EQ(fixsync::to_json(pending[0])["state"], "fix_pending");

    EXPECT_TRUE(fixsync::tracker().on_runtime("p1", {call(kNode, kSavedAt - 5)}, 0).empty());  // ran before the save
    auto changed = fixsync::tracker().on_runtime("p1", {call(kNode, kSavedAt + 1), call("function:other.py#x", kSavedAt + 1)}, 0);
    ASSERT_EQ(changed.size(), 1u);
    EXPECT_EQ(changed[0].ok_calls, 1);
    changed = fixsync::tracker().on_runtime("p1", {call(kNode, kSavedAt + 2), call(kNode, kSavedAt + 3)}, 0);
    ASSERT_EQ(changed.size(), 1u);
    EXPECT_EQ(changed[0].state, fixsync::FixState::Verified);
    EXPECT_EQ(fixsync::tracker().list("p1")[0].state, fixsync::FixState::Verified);
}

TEST_F(FixTracker, PendingThenRegressedOnTheSameError) {
    save({"app/utils.py"});
    EXPECT_TRUE(fixsync::tracker().on_runtime("p1", {call(kNode, kSavedAt + 1, true, "other message")}, 0).empty());
    const auto changed = fixsync::tracker().on_runtime("p1", {call(kNode, kSavedAt + 2, true)}, 0);
    ASSERT_EQ(changed.size(), 1u);
    EXPECT_EQ(changed[0].state, fixsync::FixState::Regressed);
    // Saving again makes it pending again.
    EXPECT_EQ(save({"app/utils.py"})[0].state, fixsync::FixState::FixPending);
}
