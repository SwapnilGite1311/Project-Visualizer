#include <gtest/gtest.h>

#include "fixture_util.hpp"

using namespace pv;
using namespace pv::builder;
using core::EdgeKind;

TEST(BuilderLinkImports, Services) {
    pv::builder::testing::FixtureState s;
    const FileBindings b = link_imports(s.g, s.fx("app/services.py"), s.py(), s.index);
    EXPECT_EQ(s.targets("module:app/services.py", EdgeKind::Imports),
              (std::vector<std::string>{"class:app/models.py#User", "function:app/utils.py#is_valid",
                                        "function:app/utils.py#normalize", "module:app/utils.py"}));
    EXPECT_EQ(b.at("utils"), "module:app/utils.py");
    EXPECT_EQ(b.at("User"), "class:app/models.py#User");
}

TEST(BuilderLinkImports, MainExternal) {
    pv::builder::testing::FixtureState s;
    const FileBindings b = link_imports(s.g, s.fx("main.py"), s.py(), s.index);
    ASSERT_NE(s.g.find_node("external:sys"), nullptr);
    EXPECT_EQ(s.g.node("external:sys").parent_id, "project:");
    EXPECT_EQ(b.at("sys"), "external:sys");
}
