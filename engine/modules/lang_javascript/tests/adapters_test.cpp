#include <gtest/gtest.h>

#include "pv/lang_javascript/adapters.hpp"

using namespace pv;

TEST(LangJsAdapters, ExtractsJavaScript) {
    const auto js = lang_javascript::make_javascript_adapter();
    EXPECT_EQ(js->id(), "javascript");
    EXPECT_EQ(js->self_keyword(), "this");
    const auto fx = js->extract("src/a.js",
                                "class A {\n"
                                "  m() {\n"
                                "    return this.x();\n"
                                "  }\n"
                                "}\n"
                                "const f = () => 1;\n");
    ASSERT_EQ(fx.definitions.size(), 3u);
    EXPECT_EQ(fx.definitions[0].qualname, "A");
    EXPECT_EQ(fx.definitions[1].qualname, "A.m");
    EXPECT_TRUE(fx.definitions[1].parent_is_class);
    EXPECT_EQ(fx.definitions[2].qualname, "f");
    ASSERT_EQ(fx.calls.size(), 1u);
    EXPECT_EQ(fx.calls[0].name, "x");
    EXPECT_EQ(fx.calls[0].object, "this");
    EXPECT_EQ(fx.calls[0].caller_qualname, "A.m");
    EXPECT_EQ(js->module_names("src/a.js"), std::vector<std::string>{"src/a"});
}

TEST(LangJsAdapters, TypeScriptAndTsx) {
    const auto ts = lang_javascript::make_typescript_adapter();
    const auto tsx = lang_javascript::make_tsx_adapter();
    EXPECT_EQ(ts->extensions(), (std::vector<std::string>{".ts", ".mts", ".cts"}));
    EXPECT_EQ(tsx->extensions(), std::vector<std::string>{".tsx"});
    const auto fx = ts->extract("m.ts", "interface E { id: number }\nclass B implements E { id = 0 }\nclass U extends B {}\n");
    ASSERT_EQ(fx.definitions.size(), 3u);
    EXPECT_EQ(fx.definitions[0].kind, "class");  // interfaces are classes on the map
    ASSERT_EQ(fx.inherits.size(), 2u);
    EXPECT_EQ(fx.inherits[0].class_qualname, "B");
    EXPECT_EQ(fx.inherits[0].base, "E");
    EXPECT_EQ(fx.inherits[1].base, "B");
    const auto view = tsx->extract("v.tsx", "export function View() { return <div>{format(1)}</div>; }\n");
    ASSERT_EQ(view.definitions.size(), 1u);
    ASSERT_EQ(view.calls.size(), 1u);
    EXPECT_EQ(view.calls[0].caller_qualname, "View");
}
