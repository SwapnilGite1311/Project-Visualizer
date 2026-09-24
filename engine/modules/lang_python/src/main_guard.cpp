#include <cctype>

#include "pv/lang_python/internal.hpp"
#include "pv/parse/ts.hpp"

namespace pv::lang_python {

bool has_main_guard(TSNode module_root, const std::string& source) {
    for (TSNode stmt : parse::named_children(module_root)) {
        if (parse::node_type(stmt) != "if_statement") continue;
        const TSNode condition = parse::child_by_field(stmt, "condition");
        if (ts_node_is_null(condition)) continue;
        std::string text;
        for (char c : parse::node_text(condition, source)) {
            if (std::isspace(static_cast<unsigned char>(c))) continue;
            text += c == '\'' ? '"' : c;
        }
        if (text == "__name__==\"__main__\"" || text == "\"__main__\"==__name__") return true;
    }
    return false;
}

}  // namespace pv::lang_python
