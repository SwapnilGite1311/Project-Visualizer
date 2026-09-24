#pragma once
#include <string>

namespace pv::lang_ipynb {

std::string notebook_to_source(const std::string& ipynb_json);

}  // namespace pv::lang_ipynb
