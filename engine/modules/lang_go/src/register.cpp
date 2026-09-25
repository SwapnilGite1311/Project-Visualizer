#include <memory>

#include "pv/lang_go/go.hpp"
#include "pv/session/registry.hpp"

void pv_register_lang_go(pv::session::Registry& reg) {
    reg.adapters.add(std::make_unique<pv::lang_go::GoAdapter>());
}
