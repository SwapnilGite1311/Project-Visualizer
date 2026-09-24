#include "pv/rpc/params.hpp"

#include "pv/core/error.hpp"

namespace pv::rpc {

namespace {

bool absent(const Json& params, const std::string& key) {
    return !params.is_object() || !params.contains(key) || params.at(key).is_null();
}

}  // namespace

std::string require_string(const Json& params, const std::string& key) {
    if (absent(params, key) || !params.at(key).is_string() || params.at(key).get<std::string>().empty()) {
        throw core::PvError(core::err::InvalidParams, "missing string param: " + key);
    }
    return params.at(key).get<std::string>();
}

std::string optional_string(const Json& params, const std::string& key, const std::string& fallback) {
    if (absent(params, key)) return fallback;
    if (!params.at(key).is_string()) throw core::PvError(core::err::InvalidParams, "param must be a string: " + key);
    return params.at(key).get<std::string>();
}

int optional_int(const Json& params, const std::string& key, int fallback) {
    if (absent(params, key)) return fallback;
    if (!params.at(key).is_number_integer()) {
        throw core::PvError(core::err::InvalidParams, "param must be an integer: " + key);
    }
    return params.at(key).get<int>();
}

int clamp_int(int value, int low, int high) {
    if (value < low) return low;
    if (value > high) return high;
    return value;
}

std::vector<std::string> optional_string_list(const Json& params, const std::string& key) {
    if (absent(params, key)) return {};
    const Json& value = params.at(key);
    const std::string message = "param must be a list of strings: " + key;
    if (!value.is_array()) throw core::PvError(core::err::InvalidParams, message);
    std::vector<std::string> out;
    for (const Json& item : value) {
        if (!item.is_string()) throw core::PvError(core::err::InvalidParams, message);
        out.push_back(item.get<std::string>());
    }
    return out;
}

}  // namespace pv::rpc
