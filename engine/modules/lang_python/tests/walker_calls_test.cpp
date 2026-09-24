#include <gtest/gtest.h>

#include <tuple>

#include "py_test_util.hpp"

using namespace pv;
using namespace pv::lang_python;
using Call = std::tuple<std::string, std::string, std::string, int>;

namespace {

std::vector<Call> calls_of(const std::string& rel) {
    std::vector<Call> out;
    for (const parse::RawCall& c : lang_python::testing::walk_source(lang_python::testing::fixture(rel)).calls) {
        out.emplace_back(c.name, c.object, c.caller_qualname, c.line);
    }
    return out;
}

}  // namespace

TEST(LangPyWalkerCalls, Services) {
    EXPECT_EQ(calls_of("app/services.py"),
              (std::vector<Call>{{"is_valid", "", "UserService.get_user", 9},
                                 {"ValueError", "", "UserService.get_user", 10},
                                 {"User", "", "UserService.get_user", 11},
                                 {"normalize", "", "UserService.get_user", 11},
                                 {"format_user", "self", "UserService.get_user", 12},
                                 {"normalize", "utils", "UserService.format_user", 15},
                                 {"display", "user", "UserService.format_user", 15}}));
}

TEST(LangPyWalkerCalls, MainAndUtils) {
    const std::vector<Call> main_calls = calls_of("main.py");
    ASSERT_GE(main_calls.size(), 2u);
    EXPECT_EQ(main_calls[main_calls.size() - 2], (Call{"exit", "sys", "", 15}));
    EXPECT_EQ(main_calls.back(), (Call{"main", "", "", 15}));
    EXPECT_EQ(calls_of("app/utils.py"),
              (std::vector<Call>{{"lower", "name.strip()", "normalize", 5}, {"strip", "name", "normalize", 5}}));
}
