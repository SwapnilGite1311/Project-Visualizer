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
std::string read_file_text(const std::string& path); // binary read of the whole file; throws PvError(err::Io, "cannot read file: " + path)
int count_lines(const std::string& text);            // "" -> 0; "a" -> 1; "a\n" -> 1; "a\nb" -> 2; "a\n\nb\n" -> 3
std::string line_range(const std::string& text, int start_line, int end_line); // 1-based inclusive

}  // namespace pv::core
