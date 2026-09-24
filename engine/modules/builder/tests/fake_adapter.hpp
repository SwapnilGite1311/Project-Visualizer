#pragma once
#include <stdexcept>
#include <string>
#include <vector>

#include "pv/core/ids.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"
#include "pv/parse/adapter.hpp"

namespace pv::builder::testing {

class FakeAdapter : public parse::LanguageAdapter {
public:
    std::string id() const override { return "fake"; }
    std::vector<std::string> extensions() const override { return {".fk"}; }
    parse::FileExtraction extract(const std::string& rel_path, const std::string& source) const override {
        if (source.find("BOOM") != std::string::npos) throw std::runtime_error("boom");
        parse::FileExtraction fx;
        fx.file_path = rel_path;
        fx.language = "fake";
        fx.loc = core::count_lines(source);
        return fx;
    }
    std::vector<std::string> module_names(const std::string& rel_path) const override {
        return {core::path_stem(rel_path)};
    }
    parse::ImportTarget resolve_import(const parse::RawImport& imp, const std::string&,
                                       const parse::ProjectIndex& index) const override {
        if (const auto file = index.file_for_module(imp.module)) {
            return parse::ImportTarget{core::make_node_id(core::NodeKind::Module, *file, ""), ""};
        }
        return parse::ImportTarget{"", imp.module};
    }
    std::string self_keyword() const override { return "self"; }
};

}  // namespace pv::builder::testing
