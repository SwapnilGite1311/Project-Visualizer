#include "pv/lang_javascript/queries.hpp"

namespace pv::lang_javascript {

const char* kJsDefinitions = R"q(
(function_declaration name: (identifier) @name) @definition.function
(generator_function_declaration name: (identifier) @name) @definition.function
(class_declaration name: (identifier) @name) @definition.class
(method_definition name: (property_identifier) @name) @definition.method
(variable_declarator name: (identifier) @name value: [(arrow_function) (function_expression)]) @definition.function
)q";

const char* kJsImports = R"q(
(import_statement (import_clause (identifier) @import.default) source: (string) @import.module)
(import_statement (import_clause (namespace_import (identifier) @import.namespace)) source: (string) @import.module)
(import_statement (import_clause (named_imports (import_specifier name: (identifier) @import.name alias: (identifier)? @import.alias))) source: (string) @import.module)
(variable_declarator name: (identifier) @import.alias value: (call_expression function: (identifier) @import.require_fn arguments: (arguments . (string) @import.module)))
(expression_statement (call_expression function: (identifier) @import.require_fn arguments: (arguments . (string) @import.module)))
)q";

const char* kJsCalls = R"q(
(call_expression function: (identifier) @call.name)
(call_expression function: (member_expression object: (_) @call.object property: (property_identifier) @call.name))
(new_expression constructor: (identifier) @call.name)
)q";

const char* kJsInherits = R"q(
(class_declaration name: (identifier) @inherit.class (class_heritage (identifier) @inherit.base))
(class_declaration name: (identifier) @inherit.class (class_heritage (member_expression) @inherit.base))
)q";

const char* kTsDefinitions = R"q(
(function_declaration name: (identifier) @name) @definition.function
(generator_function_declaration name: (identifier) @name) @definition.function
(class_declaration name: (type_identifier) @name) @definition.class
(abstract_class_declaration name: (type_identifier) @name) @definition.class
(interface_declaration name: (type_identifier) @name) @definition.interface
(method_definition name: (property_identifier) @name) @definition.method
(variable_declarator name: (identifier) @name value: [(arrow_function) (function_expression)]) @definition.function
)q";

const char* kTsInherits = R"q(
(class_declaration name: (type_identifier) @inherit.class (class_heritage (extends_clause value: (identifier) @inherit.base)))
(class_declaration name: (type_identifier) @inherit.class (class_heritage (implements_clause (type_identifier) @inherit.base)))
)q";

}  // namespace pv::lang_javascript
