#include "pv/lang_cpp/cpp.hpp"

namespace pv::lang_cpp {

const char* kCDefinitions = R"q(
(function_definition declarator: (function_declarator declarator: (identifier) @name)) @definition.function
(function_definition declarator: (pointer_declarator declarator: (function_declarator declarator: (identifier) @name))) @definition.function
(struct_specifier name: (type_identifier) @name body: (field_declaration_list)) @definition.class
)q";

const char* kCppDefinitions = R"q(
(function_definition declarator: (function_declarator declarator: (identifier) @name)) @definition.function
(function_definition declarator: (function_declarator declarator: (field_identifier) @name)) @definition.method
(function_definition declarator: (function_declarator declarator: (qualified_identifier) @name)) @definition.function
(function_definition declarator: (pointer_declarator declarator: (function_declarator declarator: (identifier) @name))) @definition.function
(function_definition declarator: (reference_declarator (function_declarator declarator: (identifier) @name))) @definition.function
(class_specifier name: (type_identifier) @name body: (field_declaration_list)) @definition.class
(struct_specifier name: (type_identifier) @name body: (field_declaration_list)) @definition.class
)q";

const char* kIncludes = R"q(
(preproc_include path: (string_literal) @import.module)
(preproc_include path: (system_lib_string) @import.module)
)q";

const char* kCCalls = R"q(
(call_expression function: (identifier) @call.name)
(call_expression function: (field_expression argument: (_) @call.object field: (field_identifier) @call.name))
)q";

const char* kCppCalls = R"q(
(call_expression function: (identifier) @call.name)
(call_expression function: (field_expression argument: (_) @call.object field: (field_identifier) @call.name))
(call_expression function: (qualified_identifier scope: (_) @call.object name: (identifier) @call.name))
)q";

const char* kCppInherits = R"q(
(class_specifier name: (type_identifier) @inherit.class (base_class_clause (type_identifier) @inherit.base))
(class_specifier name: (type_identifier) @inherit.class (base_class_clause (qualified_identifier) @inherit.base))
)q";

}  // namespace pv::lang_cpp
