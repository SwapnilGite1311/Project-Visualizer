#include "pv/core/text.hpp"
#include "pv/lang_python/internal.hpp"
#include "pv/parse/ts.hpp"
#include "walker.hpp"

namespace pv::lang_python {

parse::FileExtraction extract_python(const std::string& rel_path, const std::string& source,
                                     const std::string& language_id) {
    parse::FileExtraction fx;
    fx.file_path = rel_path;
    fx.language = language_id;
    fx.loc = core::count_lines(source);
    parse::TsParser parser(tree_sitter_python());
    parse::TsTree tree = parser.parse(source);
    fx.has_syntax_errors = tree.has_error();
    TSNode root = tree.root();
    fx.module_docstring = extract_docstring(root, source);
    fx.has_main_guard = has_main_guard(root, source);
    PythonWalker walker(source, fx);
    walker.walk(root);
    return fx;
}

}  // namespace pv::lang_python
