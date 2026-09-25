#include "pv/lang_csharp/csharp.hpp"

namespace pv::lang_csharp {

CSharpAdapter::CSharpAdapter() {
    spec_.language_id = "csharp";
    spec_.language = tree_sitter_c_sharp();
    spec_.definitions_query = kCsDefinitions;
    spec_.imports_query = kCsImports;
    spec_.calls_query = kCsCalls;
    spec_.inherits_query = kCsInherits;
    spec_.decision_node_types = {"if_statement",    "for_statement", "foreach_statement",      "while_statement",
                                 "do_statement",    "catch_clause",  "conditional_expression", "switch_section"};
}

}  // namespace pv::lang_csharp
