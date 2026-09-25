#include <regex>
#include <sstream>

#include "pv/core/text.hpp"
#include "pv/errmap/errmap.hpp"

namespace pv::errmap {

std::vector<std::string> split_lines(const std::string& text) {
    std::vector<std::string> lines;
    std::istringstream in(text);
    std::string line;
    while (std::getline(in, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        lines.push_back(line);
    }
    return lines;
}

std::string first_non_empty_line(const std::vector<std::string>& lines) {
    for (const std::string& l : lines) {
        const std::string t = core::trim(l);
        if (!t.empty()) return t;
    }
    return "";
}

std::optional<ParsedTrace> parse_python(const std::string& text) {
    static const std::string kHeader = "Traceback (most recent call last):";
    const std::size_t start = text.rfind(kHeader);  // chained exceptions: the last traceback is the one that surfaced
    if (start == std::string::npos) return std::nullopt;
    static const std::regex kFrame(R"re(^\s*File "(.+)", line (\d+), in (.+)$)re");
    ParsedTrace t;
    t.language = "python";
    std::string last;
    for (const std::string& line : split_lines(text.substr(start + kHeader.size()))) {
        std::smatch m;
        if (std::regex_match(line, m, kFrame)) {
            t.frames.push_back({m[1].str(), std::stoi(m[2].str()), core::trim(m[3].str())});
        } else if (!core::trim(line).empty()) {
            last = core::trim(line);
        }
    }
    const std::size_t colon = last.find(": ");
    t.error_type = colon == std::string::npos ? last : last.substr(0, colon);
    t.message = colon == std::string::npos ? "" : last.substr(colon + 2);
    if (!t.frames.empty()) t.frames.back().is_origin = true;
    return t;
}

}  // namespace pv::errmap
