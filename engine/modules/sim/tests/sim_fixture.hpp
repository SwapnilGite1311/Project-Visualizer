#pragma once
// Test helpers: the Python fixture project and synthetic traces get_user -> is_valid.
#include <memory>
#include <string>
#include <vector>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/runtime/hub.hpp"
#include "pv/session/test_env.hpp"
#include "pv/sim/sim.hpp"

namespace pv::sim::testing {

inline const std::string kGetUser = "method:app/services.py#UserService.get_user";
inline const std::string kIsValid = "function:app/utils.py#is_valid";

struct Fixture {
    session::TestEnv env{std::make_unique<lang_python::PythonAdapter>()};
    std::string pid;
    Fixture() {
        sandboxes().reset_for_tests();
        runtime::hub().reset_for_tests();
        pid = env.open_and_wait(session::pyproj_small_path());
    }
    ~Fixture() {
        sandboxes().reset_for_tests();
        runtime::hub().reset_for_tests();
    }
    graph::Graph graph() const {
        return env.projects->get(pid)->read([](const graph::Graph& g) { return g; });
    }
};

inline runtime::MappedEvent step(const std::string& trace, const std::string& span, const std::string& parent, const std::string& node,
                                 double ms, int64_t start_ns, const std::string& status = "ok") {
    runtime::MappedEvent m;
    m.node_id = node;
    m.ev.event_id = trace + "-" + span;
    m.ev.trace_id = trace;
    m.ev.span_id = span;
    m.ev.parent_span_id = parent;
    m.ev.kind = "call";
    m.ev.status = status;
    m.ev.start_ns = start_ns;
    m.ev.duration_ns = static_cast<int64_t>(ms * 1e6);
    return m;
}

// Three traces: get_user (10 ms) calls is_valid (2 ms).
inline std::vector<runtime::MappedEvent> three_traces() {
    std::vector<runtime::MappedEvent> out;
    for (int i = 0; i < 3; ++i) {
        const std::string t = "t" + std::to_string(i);
        out.push_back(step(t, "c", "r", kIsValid, 2, 1000 + i * 100));
        out.push_back(step(t, "r", "", kGetUser, 10, 1000 + i * 100));
    }
    return out;
}

}  // namespace pv::sim::testing
