#pragma once
#include <string>
#include <vector>

#include "pv/rpc/notifier.hpp"

namespace pv::rpc {

std::string require_string(const Json& params, const std::string& key);   // missing or not a string or empty -> PvError(err::InvalidParams, "missing string param: " + key)
std::string optional_string(const Json& params, const std::string& key, const std::string& fallback); // missing/null -> fallback; wrong type -> InvalidParams
int optional_int(const Json& params, const std::string& key, int fallback);   // missing/null -> fallback; not an integer -> InvalidParams "param must be an integer: " + key
int clamp_int(int value, int low, int high);
std::vector<std::string> optional_string_list(const Json& params, const std::string& key); // missing/null -> {}; not an array of strings -> InvalidParams "param must be a list of strings: " + key

}  // namespace pv::rpc
