#pragma once
#include <string>

#include "pv/rpc/method_table.hpp"

namespace pv::rpc {

Json handle_request(const MethodTable& table, const Json& request);
Json make_error_response(const Json& id, int code, const std::string& message);

}  // namespace pv::rpc
