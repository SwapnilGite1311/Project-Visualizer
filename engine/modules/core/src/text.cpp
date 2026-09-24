#include "pv/core/text.hpp"

#include <cctype>
#include <filesystem>
#include <fstream>
#include <sstream>

#include "pv/core/error.hpp"

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

std::string read_file_text(const std::string& path) {
    const std::filesystem::path fs_path(std::u8string(reinterpret_cast<const char8_t*>(path.data()), path.size()));
    std::ifstream in(fs_path, std::ios::binary);
    if (!in) throw PvError(err::Io, "cannot read file: " + path);
    std::ostringstream buffer;
    buffer << in.rdbuf();
    return buffer.str();
}

int count_lines(const std::string& text) {
    if (text.empty()) return 0;
    int lines = 0;
    for (char c : text) {
        if (c == '\n') ++lines;
    }
    if (text.back() != '\n') ++lines;
    return lines;
}

std::string line_range(const std::string& text, int start_line, int end_line) {
    std::vector<std::string> lines;
    std::string current;
    for (char c : text) {
        if (c == '\n') {
            if (!current.empty() && current.back() == '\r') current.pop_back();
            lines.push_back(current);
            current.clear();
        } else {
            current += c;
        }
    }
    if (!current.empty()) {
        if (current.back() == '\r') current.pop_back();
        lines.push_back(current);
    }
    const int total = static_cast<int>(lines.size());
    if (end_line > total) end_line = total;
    if (start_line < 1) start_line = 1;
    if (start_line > end_line) return "";
    std::string out;
    for (int i = start_line; i <= end_line; ++i) {
        if (i > start_line) out += '\n';
        out += lines[static_cast<size_t>(i - 1)];
    }
    return out;
}

}  // namespace pv::core
