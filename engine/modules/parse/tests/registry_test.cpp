#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/parse/registry.hpp"

using namespace pv;
using namespace pv::parse;

namespace {

class FakeAdapter : public LanguageAdapter {
public:
    FakeAdapter(std::string id, std::string ext) : id_(std::move(id)), ext_(std::move(ext)) {}
    std::string id() const override { return id_; }
    std::vector<std::string> extensions() const override { return {ext_}; }
    FileExtraction extract(const std::string& rel_path, const std::string&) const override {
        FileExtraction fx;
        fx.file_path = rel_path;
        return fx;
    }
    std::vector<std::string> module_names(const std::string& rel_path) const override { return {rel_path}; }
    ImportTarget resolve_import(const RawImport&, const std::string&, const ProjectIndex&) const override { return {}; }
    std::string self_keyword() const override { return "this"; }

private:
    std::string id_;
    std::string ext_;
};

}  // namespace

TEST(ParseRegistry, AddAndLookup) {
    AdapterRegistry registry;
    registry.add(std::make_unique<FakeAdapter>("fake", ".fk"));
    ASSERT_NE(registry.for_extension(".FK"), nullptr);
    EXPECT_EQ(registry.for_extension(".FK")->id(), "fake");
    EXPECT_EQ(registry.by_id("fake")->self_keyword(), "this");
    EXPECT_EQ(registry.for_extension(".py"), nullptr);
    EXPECT_EQ(registry.all_extensions(), (std::vector<std::string>{".fk"}));
    EXPECT_EQ(registry.all().size(), 1u);
}

TEST(ParseRegistry, Conflicts) {
    AdapterRegistry registry;
    registry.add(std::make_unique<FakeAdapter>("fake", ".fk"));
    EXPECT_THROW(registry.add(std::make_unique<FakeAdapter>("fake", ".other")), core::PvError);
    EXPECT_THROW(registry.add(std::make_unique<FakeAdapter>("fake2", ".fk")), core::PvError);
}
