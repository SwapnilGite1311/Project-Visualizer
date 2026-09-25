#include <algorithm>
#include <set>

#include "pv/lang_cpp/cpp.hpp"

namespace pv::lang_cpp {
namespace {

const std::vector<std::string> kCDecisions = {"if_statement", "for_statement", "while_statement",
                                              "do_statement", "case_statement", "conditional_expression"};

std::string unique_in(const std::vector<parse::RawDefinition>& defs, const std::string& base) {
    std::set<std::string> taken;
    for (const auto& d : defs) taken.insert(d.qualname);
    if (!taken.count(base)) return base;
    for (int n = 2;; ++n) {
        const std::string candidate = base + "~" + std::to_string(n);
        if (!taken.count(candidate)) return candidate;
    }
}

void rename_callers(std::vector<parse::RawCall>& calls, const std::string& from, const std::string& to) {
    for (parse::RawCall& c : calls) {
        if (c.caller_qualname == from) c.caller_qualname = to;
        else if (c.caller_qualname.rfind(from + ".", 0) == 0) c.caller_qualname = to + c.caller_qualname.substr(from.size());
    }
}

}  // namespace

void attach_qualified_definitions(parse::FileExtraction& fx) {
    for (parse::RawDefinition& d : fx.definitions) {
        const std::size_t last = d.name.rfind("::");
        if (last == std::string::npos) continue;
        const std::size_t before = d.name.rfind("::", last == 0 ? 0 : last - 1);
        const std::size_t cls_start = (before == std::string::npos || before >= last) ? 0 : before + 2;
        const std::string cls = d.name.substr(cls_start, last - cls_start);
        const std::string method = d.name.substr(last + 2);
        if (cls.empty() || method.empty()) continue;
        const std::string old = d.qualname;
        d.qualname = unique_in(fx.definitions, cls + "." + method);
        d.name = method;
        const bool class_here = std::any_of(fx.definitions.begin(), fx.definitions.end(), [&](const parse::RawDefinition& o) {
            return o.kind == "class" && o.qualname == cls;
        });
        if (class_here) {
            d.parent_qualname = cls;
            d.parent_is_class = true;
        }
        rename_callers(fx.calls, old, d.qualname);
    }
}

CFamilyAdapter::CFamilyAdapter(std::string id, std::vector<std::string> extensions, lang_generic::QuerySpec spec)
    : id_(std::move(id)), extensions_(std::move(extensions)), spec_(std::move(spec)) {}

parse::FileExtraction CFamilyAdapter::extract(const std::string& rel_path, const std::string& source) const {
    parse::FileExtraction fx = lang_generic::extract_with_queries(spec_, rel_path, source);
    if (id_ == "cpp") attach_qualified_definitions(fx);
    return fx;
}

std::unique_ptr<parse::LanguageAdapter> make_c_adapter() {
    lang_generic::QuerySpec spec;
    spec.language_id = "c";
    spec.language = tree_sitter_c();
    spec.definitions_query = kCDefinitions;
    spec.imports_query = kIncludes;
    spec.calls_query = kCCalls;
    spec.decision_node_types = kCDecisions;
    return std::make_unique<CFamilyAdapter>("c", std::vector<std::string>{".c"}, spec);
}

std::unique_ptr<parse::LanguageAdapter> make_cpp_adapter() {
    lang_generic::QuerySpec spec;
    spec.language_id = "cpp";
    spec.language = tree_sitter_cpp();
    spec.definitions_query = kCppDefinitions;
    spec.imports_query = kIncludes;
    spec.calls_query = kCppCalls;
    spec.inherits_query = kCppInherits;
    spec.decision_node_types = kCDecisions;
    spec.decision_node_types.push_back("catch_clause");
    return std::make_unique<CFamilyAdapter>(
        "cpp", std::vector<std::string>{".cpp", ".cc", ".cxx", ".h", ".hpp", ".hh", ".hxx", ".ipp"}, spec);
}

}  // namespace pv::lang_cpp
