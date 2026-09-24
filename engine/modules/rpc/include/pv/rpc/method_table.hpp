#pragma once
#include <functional>
#include <map>
#include <string>
#include <vector>

#include "pv/rpc/notifier.hpp"

namespace pv::rpc {

using Handler = std::function<Json(const Json& params)>;
class MethodTable {
public:
    void add(const std::string& method, Handler handler);   // duplicate -> PvError(err::Conflict, "duplicate method: " + method)
    bool has(const std::string& method) const;
    Json call(const std::string& method, const Json& params) const; // unknown -> PvError(err::MethodNotFound, "method not found: " + method)
    std::vector<std::string> names() const;                 // sorted
private:
    std::map<std::string, Handler> handlers_;
};

}  // namespace pv::rpc
