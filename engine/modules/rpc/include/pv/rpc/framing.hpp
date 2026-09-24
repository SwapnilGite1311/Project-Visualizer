#pragma once
#include <istream>
#include <optional>
#include <ostream>
#include <string>

namespace pv::rpc {

std::optional<std::string> read_message(std::istream& in);
void write_message(std::ostream& out, const std::string& body);

}  // namespace pv::rpc
