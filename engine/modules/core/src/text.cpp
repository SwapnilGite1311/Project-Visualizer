#include "pv/core/text.hpp"

#include <cctype>

namespace pv::core {

namespace {

char lower_char(char c) {
    return static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
}

bool is_space(char c) {
    return c == ' ' || c == '\t' || c == '\r' || c == '\n';
}

}  // namespace

std::vector<std::string> split(const std::string& text, char separator) {
    std::vector<std::string> parts;
    std::string current;
    for (char c : text) {
        if (c == separator) {
            parts.push_back(current);
            current.clear();
        } else {
            current += c;
        }
    }
    parts.push_back(current);
    return parts;
}

std::string join(const std::vector<std::string>& parts, const std::string& separator) {
    std::string out;
    for (size_t i = 0; i < parts.size(); ++i) {
        if (i > 0) out += separator;
        out += parts[i];
    }
    return out;
}

std::string trim(const std::string& text) {
    size_t begin = 0;
    size_t end = text.size();
    while (begin < end && is_space(text[begin])) ++begin;
    while (end > begin && is_space(text[end - 1])) --end;
    return text.substr(begin, end - begin);
}

std::string to_lower(const std::string& text) {
    std::string out = text;
    for (char& c : out) c = lower_char(c);
    return out;
}

bool contains_ci(const std::string& haystack, const std::string& needle) {
    if (needle.empty()) return true;
    return to_lower(haystack).find(to_lower(needle)) != std::string::npos;
}

bool is_subsequence_ci(const std::string& needle, const std::string& haystack) {
    size_t i = 0;
    for (char c : haystack) {
        if (i < needle.size() && lower_char(c) == lower_char(needle[i])) ++i;
    }
    return i == needle.size();
}

}  // namespace pv::core
