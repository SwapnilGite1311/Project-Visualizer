#pragma once
#include <ostream>
#include <string>
#include <vector>

#include "pv/parse/registry.hpp"

namespace pv::cli {

int run_analyze(const std::vector<std::string>& args, const parse::AdapterRegistry& adapters, std::ostream& out,
                std::ostream& err);
int run_stats(const std::vector<std::string>& args, const parse::AdapterRegistry& adapters, std::ostream& out,
              std::ostream& err);

}  // namespace pv::cli
