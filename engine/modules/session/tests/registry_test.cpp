#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;
using namespace pv::session;

TEST(SessionRegistry, TestEnvWorks) {
    TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    EXPECT_EQ(env.open_and_wait(pyproj_small_path()), "p1");
    EXPECT_EQ(&env.reg->methods, &env.methods);
    EXPECT_EQ(&env.reg->projects, env.projects.get());
}
