#include <gtest/gtest.h>

#include "pv/builder/builder.hpp"

using namespace pv;
using namespace pv::builder;

TEST(BuilderStructure, NodesFromPaths) {
    graph::Graph g;
    add_structure_nodes(g, "C:/code/demo", {"app/api/routes.py", "app/models.py", "main.py"},
                        [](const std::string&) { return std::string("python"); });
    EXPECT_EQ(g.node_count(), 6u);
    EXPECT_EQ(g.node("project:").name, "demo");
    EXPECT_EQ(g.node("package:app").parent_id, "project:");
    EXPECT_EQ(g.node("package:app/api").parent_id, "package:app");
    EXPECT_EQ(g.node("package:app/api").qualified_name, "app.api");
    EXPECT_EQ(g.node("package:app/api").name, "api");
    EXPECT_EQ(g.node("module:app/api/routes.py").parent_id, "package:app/api");
    EXPECT_EQ(g.node("module:app/models.py").parent_id, "package:app");
    EXPECT_EQ(g.node("module:main.py").parent_id, "project:");
    EXPECT_EQ(g.node("module:main.py").language, "python");
    EXPECT_EQ(g.node("module:main.py").level, 2);
}

TEST(BuilderStructure, DefinitionKind) {
    parse::RawDefinition def;
    def.kind = "class";
    EXPECT_EQ(definition_kind(def), core::NodeKind::Class);
    def.kind = "function";
    EXPECT_EQ(definition_kind(def), core::NodeKind::Function);
    def.parent_is_class = true;
    EXPECT_EQ(definition_kind(def), core::NodeKind::Method);
}
