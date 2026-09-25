#include "pv/lang_javascript/adapters.hpp"
#include "pv/session/registry.hpp"

void pv_register_lang_javascript(pv::session::Registry& reg) {
    reg.adapters.add(pv::lang_javascript::make_javascript_adapter());
    reg.adapters.add(pv::lang_javascript::make_typescript_adapter());
    reg.adapters.add(pv::lang_javascript::make_tsx_adapter());
}
