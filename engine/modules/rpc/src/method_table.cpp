#include "pv/rpc/method_table.hpp"

#include "pv/core/error.hpp"

namespace pv::rpc {

void MethodTable::add(const std::string& method, Handler handler) {
    if (handlers_.count(method)) throw core::PvError(core::err::Conflict, "duplicate method: " + method);
    handlers_.emplace(method, std::move(handler));
}

bool MethodTable::has(const std::string& method) const {
    return handlers_.count(method) > 0;
}

Json MethodTable::call(const std::string& method, const Json& params) const {
    auto it = handlers_.find(method);
    if (it == handlers_.end()) throw core::PvError(core::err::MethodNotFound, "method not found: " + method);
    return it->second(params);
}

std::vector<std::string> MethodTable::names() const {
    std::vector<std::string> out;
    for (const auto& [name, handler] : handlers_) out.push_back(name);
    return out;
}

}  // namespace pv::rpc
