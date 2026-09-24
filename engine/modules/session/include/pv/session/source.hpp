#pragma once
#include <string>

#include "pv/core/types.hpp"

namespace pv::session {

std::string source_text_for(const std::string& root_path, const core::Node& node);

}  // namespace pv::session
