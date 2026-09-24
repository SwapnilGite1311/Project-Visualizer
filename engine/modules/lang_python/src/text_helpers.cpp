#include "pv/core/text.hpp"
#include "pv/lang_python/internal.hpp"
#include "pv/parse/ts.hpp"

namespace pv::lang_python {

std::string first_line(const std::string& text, std::size_t max_len) {
    const std::size_t newline = text.find('\n');
    std::string line = core::trim(newline == std::string::npos ? text : text.substr(0, newline));
    if (line.size() > max_len) line.resize(max_len);
    return line;
}

std::string strip_string_literal(const std::string& literal) {
    std::size_t start = 0;
    const std::string prefixes = "rRuUbBfF";
    while (start < literal.size() && prefixes.find(literal[start]) != std::string::npos) ++start;
    std::string s = literal.substr(start);
    if ((s.rfind("\"\"\"", 0) == 0 || s.rfind("'''", 0) == 0) && s.size() >= 6) {
        s = s.substr(3, s.size() - 6);
    } else if ((s.rfind('"', 0) == 0 || s.rfind('\'', 0) == 0) && s.size() >= 2) {
        s = s.substr(1, s.size() - 2);
    }
    return core::trim(s);
}

std::string extract_docstring(TSNode block_or_module, const std::string& source) {
    const std::vector<TSNode> children = parse::named_children(block_or_module);
    if (children.empty()) return "";
    const TSNode first = children[0];
    if (parse::node_type(first) != "expression_statement") return "";
    const std::vector<TSNode> inner = parse::named_children(first);
    if (inner.empty() || parse::node_type(inner[0]) != "string") return "";
    std::string doc = strip_string_literal(parse::node_text(inner[0], source));
    if (doc.size() > 1000) doc.resize(1000);
    return doc;
}

}  // namespace pv::lang_python
