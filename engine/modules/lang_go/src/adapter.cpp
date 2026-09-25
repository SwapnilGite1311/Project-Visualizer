#include <algorithm>
#include <set>

#include "pv/lang_go/go.hpp"
#include "pv/parse/query.hpp"
#include "pv/parse/ts.hpp"

namespace pv::lang_go {
namespace {

bool is_version_of(const std::string& qualname, const std::string& name) {
    return qualname == name || qualname.rfind(name + "~", 0) == 0;
}

std::string unique_in(const std::vector<parse::RawDefinition>& defs, const std::string& base) {
    std::set<std::string> taken;
    for (const auto& d : defs) taken.insert(d.qualname);
    if (!taken.count(base)) return base;
    for (int n = 2;; ++n) {
        const std::string candidate = base + "~" + std::to_string(n);
        if (!taken.count(candidate)) return candidate;
    }
}

// Go methods are declared outside their type (`func (s *Store) Count()`); attach them to the receiver type.
void attach_methods_to_receivers(parse::FileExtraction& fx, const std::string& source, const TSLanguage* language) {
    const parse::TsParser parser(language);
    const parse::TsTree tree = parser.parse(source);
    const parse::TsQuery query(language, kGoReceivers);
    for (const parse::Match& m : query.run(tree.root())) {
        const parse::Capture* receiver = m.find("receiver");
        const parse::Capture* name = m.find("name");
        if (!receiver || !name) continue;
        const std::string type = parse::node_text(receiver->node, source);
        const std::string method = parse::node_text(name->node, source);
        const int line = static_cast<int>(ts_node_start_point(name->node).row) + 1;
        const bool type_known = std::any_of(fx.definitions.begin(), fx.definitions.end(),
                                            [&](const parse::RawDefinition& d) { return d.qualname == type; });
        if (!type_known) continue;
        for (parse::RawDefinition& d : fx.definitions) {
            if (!d.parent_qualname.empty() || !is_version_of(d.qualname, method) || d.span.start_line > line || d.span.end_line < line) continue;
            const std::string old = d.qualname;
            d.qualname = unique_in(fx.definitions, type + "." + method);
            d.parent_qualname = type;
            d.parent_is_class = true;
            for (parse::RawCall& c : fx.calls) {
                if (c.caller_qualname == old) c.caller_qualname = d.qualname;
                else if (c.caller_qualname.rfind(old + ".", 0) == 0) c.caller_qualname = d.qualname + c.caller_qualname.substr(old.size());
            }
            break;
        }
    }
}

}  // namespace

GoAdapter::GoAdapter() {
    spec_.language_id = "go";
    spec_.language = tree_sitter_go();
    spec_.definitions_query = kGoDefinitions;
    spec_.imports_query = kGoImports;
    spec_.calls_query = kGoCalls;
    spec_.decision_node_types = {"if_statement", "for_statement", "expression_case", "type_case", "communication_case"};
}

parse::FileExtraction GoAdapter::extract(const std::string& rel_path, const std::string& source) const {
    parse::FileExtraction fx = lang_generic::extract_with_queries(spec_, rel_path, source);
    attach_methods_to_receivers(fx, source, spec_.language);
    for (parse::RawImport& imp : fx.imports) {
        if (imp.alias.empty()) {
            const std::size_t slash = imp.module.rfind('/');
            imp.alias = slash == std::string::npos ? imp.module : imp.module.substr(slash + 1);
        }
    }
    return fx;
}

}  // namespace pv::lang_go
