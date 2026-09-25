#pragma once
#include <string>
#include <vector>

#include "pv/parse/adapter.hpp"
#include "pv/parse/project_index.hpp"
#include "pv/parse/raw.hpp"

namespace pv::lang_javascript {

inline const std::vector<std::string> kJsExtensions = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"};

// "./utils", "../api/client", "@/x" or "~/x" (tried under src/ first), "lodash/fp" (external "lodash").
parse::ImportTarget resolve_js_import(const parse::RawImport& imp, const std::string& importer_file, const parse::ProjectIndex& index);

}  // namespace pv::lang_javascript
