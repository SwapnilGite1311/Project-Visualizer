#pragma once
#include <string>

#include "pv/core/text.hpp"
#include "pv/lang_python/internal.hpp"
#include "pv/parse/raw.hpp"
#include "pv/parse/ts.hpp"
#include "../src/walker.hpp"

namespace pv::lang_python::testing {

inline std::string fixture(const std::string& rel) {
    return core::read_file_text(std::string(PV_TEST_FIXTURES) + "/pyproj_small/" + rel);
}

inline parse::FileExtraction walk_source(const std::string& source) {
    parse::FileExtraction fx;
    parse::TsParser parser(tree_sitter_python());
    parse::TsTree tree = parser.parse(source);
    PythonWalker walker(source, fx);
    walker.walk(tree.root());
    return fx;
}

}  // namespace pv::lang_python::testing
