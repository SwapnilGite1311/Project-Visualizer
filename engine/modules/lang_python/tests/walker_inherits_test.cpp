#include <gtest/gtest.h>

#include <tuple>

#include "py_test_util.hpp"

using namespace pv;
using namespace pv::lang_python;
using Inh = std::tuple<std::string, std::string, int>;

namespace {

std::vector<Inh> inherits_of(const std::string& source) {
    std::vector<Inh> out;
    for (const parse::RawInherit& i : lang_python::testing::walk_source(source).inherits) {
        out.emplace_back(i.class_qualname, i.base, i.line);
    }
    return out;
}

}  // namespace

TEST(LangPyWalkerInherits, Bases) {
    EXPECT_EQ(inherits_of(lang_python::testing::fixture("app/models.py")), (std::vector<Inh>{{"User", "Base", 9}}));
    EXPECT_EQ(inherits_of("class A(b.C, D, metaclass=M):\n    pass\n"),
              (std::vector<Inh>{{"A", "b.C", 1}, {"A", "D", 1}}));
}
