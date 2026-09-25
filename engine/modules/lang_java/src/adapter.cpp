#include <algorithm>

#include "pv/lang_java/java.hpp"

namespace pv::lang_java {

JavaAdapter::JavaAdapter() {
    spec_.language_id = "java";
    spec_.language = tree_sitter_java();
    spec_.definitions_query = kJavaDefinitions;
    spec_.imports_query = kJavaImports;
    spec_.calls_query = kJavaCalls;
    spec_.inherits_query = kJavaInherits;
    spec_.decision_node_types = {"if_statement", "for_statement", "enhanced_for_statement", "while_statement",
                                 "do_statement", "catch_clause",  "ternary_expression",     "switch_label"};
}

parse::FileExtraction JavaAdapter::extract(const std::string& rel_path, const std::string& source) const {
    parse::FileExtraction fx = lang_generic::extract_with_queries(spec_, rel_path, source);
    // The wildcard pattern also matches the plain pattern; keep only the wildcard import.
    std::vector<parse::RawImport> imports;
    for (const parse::RawImport& imp : fx.imports) {
        const bool shadowed = imp.name != "*" && std::any_of(fx.imports.begin(), fx.imports.end(), [&](const parse::RawImport& o) {
                                  return o.name == "*" && o.module == imp.module && o.line == imp.line;
                              });
        if (shadowed) continue;
        parse::RawImport kept = imp;
        // `import com.acme.util.Helper;` makes the simple name `Helper` usable in the file.
        if (kept.name != "*" && kept.alias.empty()) {
            const std::size_t dot = kept.module.rfind('.');
            kept.alias = dot == std::string::npos ? kept.module : kept.module.substr(dot + 1);
        }
        imports.push_back(kept);
    }
    fx.imports = imports;
    return fx;
}

}  // namespace pv::lang_java
