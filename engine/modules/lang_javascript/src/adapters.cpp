#include "pv/lang_javascript/adapters.hpp"

#include "pv/lang_generic/path_modules.hpp"
#include "pv/lang_javascript/queries.hpp"
#include "pv/lang_javascript/resolve.hpp"

namespace pv::lang_javascript {
namespace {

const std::vector<std::string> kDecisionTypes = {"if_statement",    "for_statement",   "for_in_statement",   "while_statement",
                                                 "do_statement",    "catch_clause",    "ternary_expression", "switch_case"};

lang_generic::QuerySpec typescript_spec(const std::string& id, const TSLanguage* language) {
    lang_generic::QuerySpec spec;
    spec.language_id = id;
    spec.language = language;
    spec.definitions_query = kTsDefinitions;
    spec.imports_query = kJsImports;
    spec.calls_query = kJsCalls;
    spec.inherits_query = kTsInherits;
    spec.decision_node_types = kDecisionTypes;
    spec.require_function = "require";
    return spec;
}

}  // namespace

JsFamilyAdapter::JsFamilyAdapter(std::string id, std::vector<std::string> extensions, lang_generic::QuerySpec spec)
    : id_(std::move(id)), extensions_(std::move(extensions)), spec_(std::move(spec)) {}

std::string JsFamilyAdapter::id() const { return id_; }
std::vector<std::string> JsFamilyAdapter::extensions() const { return extensions_; }

parse::FileExtraction JsFamilyAdapter::extract(const std::string& rel_path, const std::string& source) const {
    return lang_generic::extract_with_queries(spec_, rel_path, source);
}

std::vector<std::string> JsFamilyAdapter::module_names(const std::string& rel_path) const {
    return lang_generic::path_module_names(rel_path);
}

parse::ImportTarget JsFamilyAdapter::resolve_import(const parse::RawImport& imp, const std::string& importer_file,
                                                    const parse::ProjectIndex& index) const {
    return resolve_js_import(imp, importer_file, index);
}

std::string JsFamilyAdapter::self_keyword() const { return "this"; }

std::unique_ptr<parse::LanguageAdapter> make_javascript_adapter() {
    lang_generic::QuerySpec spec;
    spec.language_id = "javascript";
    spec.language = tree_sitter_javascript();
    spec.definitions_query = kJsDefinitions;
    spec.imports_query = kJsImports;
    spec.calls_query = kJsCalls;
    spec.inherits_query = kJsInherits;
    spec.decision_node_types = kDecisionTypes;
    spec.require_function = "require";
    return std::make_unique<JsFamilyAdapter>("javascript", std::vector<std::string>{".js", ".jsx", ".mjs", ".cjs"}, spec);
}

std::unique_ptr<parse::LanguageAdapter> make_typescript_adapter() {
    return std::make_unique<JsFamilyAdapter>("typescript", std::vector<std::string>{".ts", ".mts", ".cts"},
                                             typescript_spec("typescript", tree_sitter_typescript()));
}

std::unique_ptr<parse::LanguageAdapter> make_tsx_adapter() {
    return std::make_unique<JsFamilyAdapter>("tsx", std::vector<std::string>{".tsx"}, typescript_spec("tsx", tree_sitter_tsx()));
}

}  // namespace pv::lang_javascript
