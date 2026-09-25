#pragma once
#include <string>
#include <vector>

#include "pv/parse/project_index.hpp"

namespace pv::lang_generic {

// Languages that import files by path (JS/TS, C/C++) or by directory (Go) share these helpers.

// "src/a/b.ts" -> {"src/a/b"}; "src/a/index.js" -> {"src/a/index", "src/a"}
std::vector<std::string> path_module_names(const std::string& rel_path);

// "./x.js" from "src/a/m.js" with {".js"} -> "src/a/x"
std::string resolve_relative_path(const std::string& importer_file, const std::string& spec,
                                  const std::vector<std::string>& strip_extensions);

// The longest known module name m with import_path == m or import_path ending in "/" + m; "" if none.
std::string longest_suffix_module(const parse::ProjectIndex& index, const std::string& import_path);

// "@scope/pkg/sub" -> "@scope/pkg"; "lodash/fp" -> "lodash"; "node:fs" -> "node:fs"
std::string external_package_name(const std::string& spec);

}  // namespace pv::lang_generic
