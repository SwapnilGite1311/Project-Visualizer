#include "pv/lang_csharp/csharp.hpp"

namespace pv::lang_csharp {

const char* kCsDefinitions = R"q(
(class_declaration name: (identifier) @name) @definition.class
(interface_declaration name: (identifier) @name) @definition.interface
(struct_declaration name: (identifier) @name) @definition.class
(record_declaration name: (identifier) @name) @definition.class
(enum_declaration name: (identifier) @name) @definition.class
(method_declaration name: (identifier) @name) @definition.method
(constructor_declaration name: (identifier) @name) @definition.method
)q";

const char* kCsImports = R"q(
(using_directive (qualified_name) @import.module)
(using_directive (identifier) @import.module)
)q";

const char* kCsCalls = R"q(
(invocation_expression function: (identifier) @call.name)
(invocation_expression function: (member_access_expression expression: (_) @call.object name: (identifier) @call.name))
(object_creation_expression type: (identifier) @call.name)
)q";

const char* kCsInherits = R"q(
(class_declaration name: (identifier) @inherit.class (base_list (identifier) @inherit.base))
)q";

}  // namespace pv::lang_csharp
