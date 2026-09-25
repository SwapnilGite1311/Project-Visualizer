#include "pv/lang_rust/rust.hpp"

namespace pv::lang_rust {

const char* kRustDefinitions = R"q(
(function_item name: (identifier) @name) @definition.function
(struct_item name: (type_identifier) @name) @definition.class
(enum_item name: (type_identifier) @name) @definition.class
(trait_item name: (type_identifier) @name) @definition.interface
)q";

const char* kRustImports = R"q(
(use_declaration argument: (scoped_identifier) @import.module)
(use_declaration argument: (identifier) @import.module)
(use_declaration argument: (use_as_clause path: (_) @import.module alias: (identifier) @import.alias))
(mod_item name: (identifier) @import.module !body)
)q";

const char* kRustCalls = R"q(
(call_expression function: (identifier) @call.name)
(call_expression function: (scoped_identifier path: (_) @call.object name: (identifier) @call.name))
(call_expression function: (field_expression value: (_) @call.object field: (field_identifier) @call.name))
)q";

const char* kRustImpls = R"q(
(impl_item type: (type_identifier) @impl.type body: (declaration_list (function_item name: (identifier) @impl.fn)))
(impl_item trait: (type_identifier) @impl.trait type: (type_identifier) @impl.for)
)q";

}  // namespace pv::lang_rust
