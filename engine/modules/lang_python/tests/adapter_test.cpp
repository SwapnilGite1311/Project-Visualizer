#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"

using pv::lang_python::PythonAdapter;

TEST(LangPyAdapter, Identity) {
    const PythonAdapter adapter;
    EXPECT_EQ(adapter.id(), "python");
    EXPECT_EQ(adapter.extensions(), (std::vector<std::string>{".py", ".pyi"}));
    EXPECT_EQ(adapter.self_keyword(), "self");
}
