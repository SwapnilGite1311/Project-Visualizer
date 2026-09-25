#include <memory>

#include "pv/lang_csharp/csharp.hpp"
#include "pv/session/registry.hpp"

void pv_register_lang_csharp(pv::session::Registry& reg) { reg.adapters.add(std::make_unique<pv::lang_csharp::CSharpAdapter>()); }
