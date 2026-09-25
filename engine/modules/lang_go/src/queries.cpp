#include "pv/lang_go/go.hpp"

namespace pv::lang_go {

const char* kGoDefinitions = R"q(
(function_declaration name: (identifier) @name) @definition.function
(method_declaration name: (field_identifier) @name) @definition.method
(type_declaration (type_spec name: (type_identifier) @name type: (struct_type)) @definition.class)
(type_declaration (type_spec name: (type_identifier) @name type: (interface_type)) @definition.interface)
)q";

const char* kGoImports = R"q(
(import_spec name: (package_identifier) @import.alias path: (interpreted_string_literal) @import.module)
(import_spec !name path: (interpreted_string_literal) @import.module)
)q";

const char* kGoCalls = R"q(
(call_expression function: (identifier) @call.name)
(call_expression function: (selector_expression operand: (_) @call.object field: (field_identifier) @call.name))
)q";

const char* kGoReceivers = R"q(
(method_declaration receiver: (parameter_list (parameter_declaration type: (type_identifier) @receiver)) name: (field_identifier) @name)
(method_declaration receiver: (parameter_list (parameter_declaration type: (pointer_type (type_identifier) @receiver))) name: (field_identifier) @name)
)q";

}  // namespace pv::lang_go
