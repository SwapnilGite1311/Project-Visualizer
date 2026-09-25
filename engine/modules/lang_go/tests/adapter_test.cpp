#include <gtest/gtest.h>

#include <algorithm>

#include "pv/lang_go/go.hpp"

using namespace pv;

TEST(LangGoAdapter, MethodsJoinTheirReceiverType) {
    const lang_go::GoAdapter go;
    const auto fx = go.extract("store.go",
                               "package store\n"
                               "\n"
                               "import (\n"
                               "\t\"fmt\"\n"
                               "\tlog \"github.com/acme/log\"\n"
                               ")\n"
                               "\n"
                               "type Store struct{}\n"
                               "\n"
                               "func (s *Store) Count() int { return helper() }\n"
                               "\n"
                               "func helper() int { return 1 }\n");
    ASSERT_EQ(fx.definitions.size(), 3u);
    const auto count = std::find_if(fx.definitions.begin(), fx.definitions.end(), [](const auto& d) { return d.name == "Count"; });
    ASSERT_NE(count, fx.definitions.end());
    EXPECT_EQ(count->qualname, "Store.Count");
    EXPECT_EQ(count->parent_qualname, "Store");
    EXPECT_TRUE(count->parent_is_class);
    ASSERT_EQ(fx.calls.size(), 1u);
    EXPECT_EQ(fx.calls[0].name, "helper");
    EXPECT_EQ(fx.calls[0].caller_qualname, "Store.Count");
    ASSERT_EQ(fx.imports.size(), 2u);
    EXPECT_EQ(fx.imports[0].module, "fmt");
    EXPECT_EQ(fx.imports[0].alias, "fmt");
    EXPECT_EQ(fx.imports[1].alias, "log");
}
