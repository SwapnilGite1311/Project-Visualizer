#include <memory>

#include "pv/lang_rust/rust.hpp"
#include "pv/session/registry.hpp"

void pv_register_lang_rust(pv::session::Registry& reg) { reg.adapters.add(std::make_unique<pv::lang_rust::RustAdapter>()); }
