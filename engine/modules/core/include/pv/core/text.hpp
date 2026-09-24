#pragma once
#include <string>
#include <vector>

namespace pv::core {

std::vector<std::string> split(const std::string& text, char separator); // keeps empty parts: "a,,b" -> {"a","","b"}; "" -> {""}
std::string join(const std::vector<std::string>& parts, const std::string& separator);
std::string trim(const std::string& text);        // removes ' ', '\t', '\r', '\n' at both ends
std::string to_lower(const std::string& text);    // ASCII only
bool contains_ci(const std::string& haystack, const std::string& needle); // ASCII case-insensitive; empty needle -> true
bool is_subsequence_ci(const std::string& needle, const std::string& haystack); // "usv" in "UserService" -> true

}  // namespace pv::core
