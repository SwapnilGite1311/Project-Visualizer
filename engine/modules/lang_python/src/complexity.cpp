#include <string>
#include <unordered_set>
#include <vector>

#include "pv/lang_python/internal.hpp"
#include "pv/parse/ts.hpp"

namespace pv::lang_python {

int compute_complexity(TSNode definition) {
    static const std::unordered_set<std::string> kDecision = {
        "if_statement", "elif_clause", "for_statement", "while_statement", "except_clause",
        "conditional_expression", "boolean_operator", "for_in_clause", "if_clause", "case_clause"};
    TSNode body = parse::child_by_field(definition, "body");
    if (ts_node_is_null(body)) return 1;
    int count = 1;
    std::vector<TSNode> stack{body};
    while (!stack.empty()) {
        TSNode n = stack.back();
        stack.pop_back();
        const std::string t = parse::node_type(n);
        if (t == "function_definition" || t == "class_definition") continue;  // nested defs count separately
        if (kDecision.count(t)) ++count;
        for (TSNode c : parse::named_children(n)) stack.push_back(c);
    }
    return count;
}

}  // namespace pv::lang_python
