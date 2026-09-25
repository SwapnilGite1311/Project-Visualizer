#include <regex>

#include "pv/core/text.hpp"
#include "pv/errmap/errmap.hpp"

namespace pv::errmap {

std::optional<ParsedTrace> parse_javascript(const std::string& text) {
    const auto lines = split_lines(text);
    static const std::regex kHead(R"(^(\w*Error|Error)(?:: (.*))?$)");
    static const std::regex kFrame(R"(^\s*at (?:async )?(?:(.+?) \()?(.+?):(\d+):(\d+)\)?$)");
    std::smatch head;
    const std::string first = first_non_empty_line(lines);
    if (!std::regex_match(first, head, kHead)) return std::nullopt;
    ParsedTrace t;
    t.language = "javascript";
    t.error_type = head[1].str();
    t.message = head[2].str();
    for (const std::string& line : lines) {
        std::smatch m;
        if (!std::regex_match(line, m, kFrame)) continue;
        if (m[2].str().rfind("node:", 0) == 0) continue;  // Node.js internals
        t.frames.push_back({m[2].str(), std::stoi(m[3].str()), m[1].str()});
    }
    if (t.frames.empty()) return std::nullopt;
    t.frames.front().is_origin = true;
    return t;
}

std::optional<ParsedTrace> parse_java(const std::string& text) {
    const auto lines = split_lines(text);
    static const std::regex kHead(R"(^([\w.$]+(?:Exception|Error))(?:: (.*))?$)");
    static const std::regex kFrame(R"(^\s*at ([\w.$<>]+)\(([^:()]+)(?::(\d+))?\)$)");
    std::string first = first_non_empty_line(lines);
    static const std::string kThread = "Exception in thread \"";
    if (first.rfind(kThread, 0) == 0) {
        const std::size_t end = first.find("\" ", kThread.size());
        if (end != std::string::npos) first = first.substr(end + 2);
    }
    std::smatch head;
    if (!std::regex_match(first, head, kHead)) return std::nullopt;
    ParsedTrace t;
    t.language = "java";
    t.error_type = head[1].str();
    t.message = head[2].str();
    for (const std::string& line : lines) {
        if (core::trim(line).rfind("Caused by:", 0) == 0) break;  // frames of the first block only
        std::smatch m;
        if (!std::regex_match(line, m, kFrame)) continue;
        t.frames.push_back({m[2].str(), m[3].matched ? std::stoi(m[3].str()) : 0, m[1].str()});
    }
    if (t.frames.empty()) return std::nullopt;
    t.frames.front().is_origin = true;
    return t;
}

}  // namespace pv::errmap
