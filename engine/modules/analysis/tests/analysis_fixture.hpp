#pragma once
#include <memory>

#include "pv/analysis/analysis.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

namespace pv::analysis::testing {

// The Python fixture project, loaded and ready.
struct Fixture {
    session::TestEnv env{std::make_unique<lang_python::PythonAdapter>()};
    std::shared_ptr<session::Project> project;
    Fixture() { project = env.projects->get_ready(env.open_and_wait(session::pyproj_small_path())); }
    template <class F> auto read(F&& fn) { return project->read(std::forward<F>(fn)); }
};

}  // namespace pv::analysis::testing
