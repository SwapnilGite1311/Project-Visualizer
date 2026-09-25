#include <memory>

#include "pv/lang_java/java.hpp"
#include "pv/session/registry.hpp"

void pv_register_lang_java(pv::session::Registry& reg) {
    reg.adapters.add(std::make_unique<pv::lang_java::JavaAdapter>());
}
