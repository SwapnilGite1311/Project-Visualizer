#include <gtest/gtest.h>

#include <algorithm>

#include "pv/lang_rust/rust.hpp"

using namespace pv;

namespace {

const parse::RawDefinition* find_def(const parse::FileExtraction& fx, const std::string& qualname) {
    const auto it = std::find_if(fx.definitions.begin(), fx.definitions.end(), [&](const auto& d) { return d.qualname == qualname; });
    return it == fx.definitions.end() ? nullptr : &*it;
}

}  // namespace

TEST(LangRustAdapter, ImplBlocksAndTraits) {
    const lang_rust::RustAdapter rust;
    const auto fx = rust.extract("src/store.rs",
                                 "pub trait Countable { fn count(&self) -> usize; }\n"
                                 "pub struct Store { n: usize }\n"
                                 "impl Store {\n"
                                 "    fn new() -> Self { Store { n: build() } }\n"
                                 "}\n"
                                 "impl Countable for Store {\n"
                                 "    fn count(&self) -> usize { if self.n > 0 { self.n } else { 0 } }\n"
                                 "}\n"
                                 "fn build() -> usize { 1 }\n");
    const auto* created = find_def(fx, "Store.new");
    ASSERT_NE(created, nullptr);
    EXPECT_EQ(created->parent_qualname, "Store");
    EXPECT_TRUE(created->parent_is_class);
    const auto* count = find_def(fx, "Store.count");
    ASSERT_NE(count, nullptr);
    EXPECT_EQ(count->complexity, 2);
    EXPECT_NE(find_def(fx, "Countable"), nullptr);
    EXPECT_NE(find_def(fx, "build"), nullptr);
    ASSERT_EQ(fx.inherits.size(), 1u);
    EXPECT_EQ(fx.inherits[0].class_qualname, "Store");
    EXPECT_EQ(fx.inherits[0].base, "Countable");
    const auto call = std::find_if(fx.calls.begin(), fx.calls.end(), [](const auto& c) { return c.name == "build"; });
    ASSERT_NE(call, fx.calls.end());
    EXPECT_EQ(call->caller_qualname, "Store.new");
}

TEST(LangRustAdapter, UseAndModImports) {
    const lang_rust::RustAdapter rust;
    const auto fx = rust.extract("src/main.rs",
                                 "mod store;\n"
                                 "use crate::store::Store;\n"
                                 "use std::io::Result as IoResult;\n"
                                 "use serde;\n"
                                 "fn main() { let s = Store::new(); s.add(1); helper(); }\n"
                                 "fn helper() {}\n");
    ASSERT_EQ(fx.imports.size(), 4u);
    EXPECT_EQ(fx.imports[0].module, "store");
    EXPECT_EQ(fx.imports[1].module, "crate::store");
    EXPECT_EQ(fx.imports[1].name, "Store");
    EXPECT_EQ(fx.imports[2].module, "std::io::Result");
    EXPECT_EQ(fx.imports[2].alias, "IoResult");
    EXPECT_EQ(fx.imports[3].module, "serde");
    ASSERT_EQ(fx.calls.size(), 3u);
    EXPECT_EQ(fx.calls[0].object, "Store");
    EXPECT_EQ(fx.calls[0].name, "new");
}
