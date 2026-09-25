#pragma once
#include <tree_sitter/api.h>

extern "C" const TSLanguage* tree_sitter_javascript(void);
extern "C" const TSLanguage* tree_sitter_typescript(void);
extern "C" const TSLanguage* tree_sitter_tsx(void);

namespace pv::lang_javascript {

// Query strings using the lang_generic capture names. TypeScript reuses the JavaScript imports and calls queries.
extern const char* kJsDefinitions;
extern const char* kJsImports;
extern const char* kJsCalls;
extern const char* kJsInherits;
extern const char* kTsDefinitions;
extern const char* kTsInherits;

}  // namespace pv::lang_javascript
