#include <memory>
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/registry.hpp"

void pv_register_lang_python(pv::session::Registry& reg) {
    reg.adapters.add(std::make_unique<pv::lang_python::PythonAdapter>());
}
