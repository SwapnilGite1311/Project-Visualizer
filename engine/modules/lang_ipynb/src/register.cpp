#include <memory>

#include "pv/lang_ipynb/notebook_adapter.hpp"
#include "pv/session/registry.hpp"

void pv_register_lang_ipynb(pv::session::Registry& reg) { reg.adapters.add(std::make_unique<pv::lang_ipynb::NotebookAdapter>()); }
