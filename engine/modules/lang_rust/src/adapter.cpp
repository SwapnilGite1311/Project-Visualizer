#include <algorithm>
#include <set>

#include "pv/lang_rust/rust.hpp"
#include "pv/parse/query.hpp"
#include "pv/parse/ts.hpp"

namespace pv::lang_rust {
namespace {

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

int line_of(TSNode node) { return static_cast<int>(ts_node_start_point(node).row) + 1; }

// Functions in `impl T { … }` become methods of T; `impl Trait for T` means T implements Trait.
void apply_impls(parse::FileExtraction& fx, const std::string& source) {
    const parse::TsParser parser(tree_sitter_rust());
    const parse::TsTree tree = parser.parse(source);
    const parse::TsQuery query(tree_sitter_rust(), kRustImpls);
    for (const parse::Match& m : query.run(tree.root())) {
        if (const parse::Capture* trait = m.find("impl.trait")) {
            const parse::Capture* type = m.find("impl.for");
            if (type) fx.inherits.push_back({parse::node_text(type->node, source), parse::node_text(trait->node, source), line_of(trait->node)});
            continue;
        }
        const parse::Capture* type = m.find("impl.type");
        const parse::Capture* fn = m.find("impl.fn");
        if (!type || !fn) continue;
        const std::string type_name = parse::node_text(type->node, source);
        const std::string fn_name = parse::node_text(fn->node, source);
        const int line = line_of(fn->node);
        for (parse::RawDefinition& d : fx.definitions) {
            if (d.name != fn_name || d.span.start_line > line || d.span.end_line < line || !d.parent_qualname.empty()) continue;
            if (d.qualname.find('.') != std::string::npos) continue;  // already attached
            const std::string old = d.qualname;
            d.qualname = unique_in(fx.definitions, type_name + "." + fn_name);
            const bool type_here = std::any_of(fx.definitions.begin(), fx.definitions.end(),
                                               [&](const parse::RawDefinition& o) { return o.kind == "class" && o.qualname == type_name; });
            if (type_here) {
                d.parent_qualname = type_name;
                d.parent_is_class = true;
            }
            rename_callers(fx.calls, old, d.qualname);
            break;
        }
    }
}

// `use a::b::C` -> module "a::b", name "C" (so C is bound by its own name); aliases and `mod x;` stay as written.
void split_use_paths(parse::FileExtraction& fx) {
    for (parse::RawImport& imp : fx.imports) {
        if (!imp.alias.empty() || !imp.name.empty()) continue;
        const std::size_t sep = imp.module.rfind("::");
        if (sep == std::string::npos) continue;
        imp.name = imp.module.substr(sep + 2);
        imp.module = imp.module.substr(0, sep);
    }
}

}  // namespace

RustAdapter::RustAdapter() {
    spec_.language_id = "rust";
    spec_.language = tree_sitter_rust();
    spec_.definitions_query = kRustDefinitions;
    spec_.imports_query = kRustImports;
    spec_.calls_query = kRustCalls;
    spec_.decision_node_types = {"if_expression", "match_arm", "while_expression", "for_expression", "loop_expression"};
}

parse::FileExtraction RustAdapter::extract(const std::string& rel_path, const std::string& source) const {
    parse::FileExtraction fx = lang_generic::extract_with_queries(spec_, rel_path, source);
    apply_impls(fx, source);
    split_use_paths(fx);
    return fx;
}

}  // namespace pv::lang_rust
