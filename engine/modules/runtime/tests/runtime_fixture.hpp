#pragma once
// Test helpers: the Python fixture project and small runtime events.
#include <memory>
#include <string>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/runtime/hub.hpp"
#include "pv/session/test_env.hpp"

namespace pv::runtime::testing {

struct Fixture {
    session::TestEnv env{std::make_unique<lang_python::PythonAdapter>()};
    std::shared_ptr<session::Project> project;
    std::string root = session::pyproj_small_path();
    Fixture() {
        hub().reset_for_tests();
        project = env.projects->get_ready(env.open_and_wait(root));
    }
    ~Fixture() { hub().reset_for_tests(); }
};

inline RuntimeEvent event(const std::string& span, const std::string& file, int line, const std::string& parent = "",
                          const std::string& trace = "t1", int64_t start_ns = 100, int64_t duration_ns = 10) {
    RuntimeEvent e;
    e.event_id = "e-" + span;
    e.trace_id = trace;
    e.span_id = span;
    e.parent_span_id = parent;
    e.kind = "call";
    e.name = "fn-" + span;
    e.file_path = file;
    e.line = line;
    e.status = "ok";
    e.start_ns = start_ns;
    e.duration_ns = duration_ns;
    return e;
}

}  // namespace pv::runtime::testing
