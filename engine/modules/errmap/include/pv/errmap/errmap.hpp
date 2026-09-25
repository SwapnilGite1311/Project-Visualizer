#pragma once
#include <optional>
#include <string>
#include <vector>

#include "pv/graph/graph.hpp"

namespace pv::errmap {

struct Frame {
    std::string file_path;
    int line = 0;
    std::string function;
    std::string node_id;
    bool in_project = false;
    bool is_origin = false;  // the frame where the error was raised
};

struct ParsedTrace {
    std::string language;  // python, javascript, java, go, csharp or unknown
    std::string error_type;
    std::string message;
    std::vector<Frame> frames;
};

std::optional<ParsedTrace> parse_python(const std::string& text);
std::optional<ParsedTrace> parse_javascript(const std::string& text);
std::optional<ParsedTrace> parse_java(const std::string& text);
std::optional<ParsedTrace> parse_go(const std::string& text);
std::optional<ParsedTrace> parse_csharp(const std::string& text);
ParsedTrace parse_generic(const std::string& text);
ParsedTrace parse_any(const std::string& text);  // python, javascript, java, go, csharp, then generic

// Sets node_id and in_project for every frame that points into the project.
void map_frames(ParsedTrace& t, const graph::Graph& g, const std::string& root_path);

// Internal helpers shared by the parsers.
std::vector<std::string> split_lines(const std::string& text);  // without "\r"
std::string first_non_empty_line(const std::vector<std::string>& lines);

}  // namespace pv::errmap
