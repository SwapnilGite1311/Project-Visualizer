#pragma once
#include <string>
#include <vector>
#include "pv/core/types.hpp"

namespace pv::parse {

struct RawDefinition {
    std::string kind;              // "class" or "function"
    std::string name;              // e.g. "start"
    std::string qualname;          // unique in-file qualname, e.g. "App.start" or "helper~2"
    std::string parent_qualname;   // "" = module level
    bool parent_is_class = false;  // true -> this function is a method
    core::Span span;
    int complexity = 1;
    std::string signature;         // first line of the definition, trimmed, max 200 chars
    std::string docstring;         // "" if none, max 1000 chars
};

struct RawImport {
    std::string module;            // as written: "os.path", ".utils", "..", "..pkg"
    std::string name;              // from-import symbol; "" for plain import; "*" for wildcard
    std::string alias;             // "" if none
    int line = 0;
    std::string scope_qualname;    // "" = module level
};

struct RawCall {
    std::string name;              // called identifier, e.g. "get_user"
    std::string object;            // text before the last ".", e.g. "self" or "db.session"; "" for plain calls
    int line = 0;
    std::string caller_qualname;   // enclosing definition qualname; "" = module level
};

struct RawInherit {
    std::string class_qualname;
    std::string base;              // as written: "Base" or "models.Model"
    int line = 0;
};

struct FileExtraction {
    std::string file_path;         // relative, normalized
    std::string language;          // adapter id
    int loc = 0;                   // number of lines of the file
    bool has_syntax_errors = false;
    bool has_main_guard = false;   // entry-point marker (Python: if __name__ == "__main__")
    std::string module_docstring;
    std::vector<RawDefinition> definitions;
    std::vector<RawImport> imports;
    std::vector<RawCall> calls;
    std::vector<RawInherit> inherits;
};

}  // namespace pv::parse
