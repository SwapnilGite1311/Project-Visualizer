#include "pv/lang_java/java.hpp"

namespace pv::lang_java {

const char* kJavaDefinitions = R"q(
(class_declaration name: (identifier) @name) @definition.class
(interface_declaration name: (identifier) @name) @definition.interface
(enum_declaration name: (identifier) @name) @definition.class
(record_declaration name: (identifier) @name) @definition.class
(method_declaration name: (identifier) @name) @definition.method
(constructor_declaration name: (identifier) @name) @definition.method
)q";

const char* kJavaImports = R"q(
(import_declaration (scoped_identifier) @import.module (asterisk) @import.wildcard)
(import_declaration (scoped_identifier) @import.module)
(import_declaration (identifier) @import.module)
)q";

const char* kJavaCalls = R"q(
(method_invocation object: (_) @call.object name: (identifier) @call.name)
(method_invocation !object name: (identifier) @call.name)
(object_creation_expression type: (type_identifier) @call.name)
)q";

const char* kJavaInherits = R"q(
(class_declaration name: (identifier) @inherit.class superclass: (superclass (type_identifier) @inherit.base))
(class_declaration name: (identifier) @inherit.class interfaces: (super_interfaces (type_list (type_identifier) @inherit.base)))
(interface_declaration name: (identifier) @inherit.class (extends_interfaces (type_list (type_identifier) @inherit.base)))
)q";

}  // namespace pv::lang_java
