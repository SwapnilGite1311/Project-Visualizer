#include <regex>

#include "pv/core/text.hpp"
#include "pv/errmap/errmap.hpp"

namespace pv::errmap {

std::optional<ParsedTrace> parse_go(const std::string& text) {
    const bool goroutine = text.find("goroutine ") != std::string::npos && text.find("[running]") != std::string::npos;
    const std::string first = first_non_empty_line(split_lines(text));
    if (!goroutine && first.rfind("panic: ", 0) != 0) return std::nullopt;
    static const std::regex kFunction(R"(^([\w./*()]+)\(.*\)$)");
    static const std::regex kLocation(R"(^\s+(.+\.go):(\d+).*$)");
    ParsedTrace t;
    t.language = "go";
    t.error_type = "panic";
    if (first.rfind("panic: ", 0) == 0) t.message = first.substr(7);
    const auto lines = split_lines(text);
    bool after_header = !goroutine;
    for (std::size_t i = 0; i + 1 < lines.size(); ++i) {
        if (lines[i].rfind("goroutine ", 0) == 0) {
            if (!t.frames.empty()) break;  // only the first (panicking) goroutine
            after_header = true;
            continue;
        }
        std::smatch fn, loc;
        if (after_header && std::regex_match(lines[i], fn, kFunction) && std::regex_match(lines[i + 1], loc, kLocation)) {
            t.frames.push_back({loc[1].str(), std::stoi(loc[2].str()), fn[1].str()});
            ++i;
        }
    }
    if (t.frames.empty()) return std::nullopt;
    t.frames.front().is_origin = true;
    return t;
}

std::optional<ParsedTrace> parse_csharp(const std::string& text) {
    const auto lines = split_lines(text);
    static const std::regex kHead(R"(^([\w.]+Exception): (.*)$)");
    static const std::regex kFrame(R"(^\s*at (.+?) in (.+):line (\d+)$)");
    std::smatch head;
    const std::string first = first_non_empty_line(lines);
    if (!std::regex_match(first, head, kHead)) return std::nullopt;
    ParsedTrace t;
    t.language = "csharp";
    t.error_type = head[1].str();
    t.message = head[2].str();
    for (const std::string& line : lines) {
        std::smatch m;
        if (std::regex_match(line, m, kFrame)) t.frames.push_back({m[2].str(), std::stoi(m[3].str()), m[1].str()});
    }
    if (t.frames.empty()) return std::nullopt;
    t.frames.front().is_origin = true;
    return t;
}

ParsedTrace parse_generic(const std::string& text) {
    static const std::regex kLocation(R"(((?:[A-Za-z]:)?[\\/\w.\-]+\.\w+):(\d+))");
    ParsedTrace t;
    t.language = "unknown";
    t.error_type = "Error";
    t.message = first_non_empty_line(split_lines(text));
    if (t.message.size() > 200) t.message.resize(200);
    for (auto it = std::sregex_iterator(text.begin(), text.end(), kLocation); it != std::sregex_iterator(); ++it) {
        t.frames.push_back({(*it)[1].str(), std::stoi((*it)[2].str()), ""});
    }
    if (!t.frames.empty()) t.frames.front().is_origin = true;
    return t;
}

ParsedTrace parse_any(const std::string& text) {
    for (auto parser : {parse_python, parse_javascript, parse_java, parse_go, parse_csharp}) {
        if (auto t = parser(text)) return *t;
    }
    return parse_generic(text);
}

}  // namespace pv::errmap
