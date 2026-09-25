#include "pv/lang_cpp/cpp.hpp"
#include "pv/session/registry.hpp"

void pv_register_lang_cpp(pv::session::Registry& reg) {
    reg.adapters.add(pv::lang_cpp::make_c_adapter());
    reg.adapters.add(pv::lang_cpp::make_cpp_adapter());
}
