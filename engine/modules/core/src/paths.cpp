#include "pv/core/paths.hpp"

#include <cctype>
#include <vector>

namespace pv::core {

namespace {

bool is_drive(const std::string& segment) {
    return segment.size() == 2 && std::isalpha(static_cast<unsigned char>(segment[0])) && segment[1] == ':';
}

}  // namespace

std::string normalize_path(const std::string& path) {
    std::string p = path;
    for (char& c : p) {
        if (c == '\\') c = '/';
    }
    const bool absolute_posix = !p.empty() && p[0] == '/';

    std::vector<std::string> segments;
    std::string current;
    for (char c : p) {
        if (c == '/') {
            segments.push_back(current);
            current.clear();
        } else {
            current += c;
        }
    }
    segments.push_back(current);

    const bool has_drive = !segments.empty() && is_drive(segments[0]);
    const bool relative = !absolute_posix && !has_drive;

    std::vector<std::string> result;
    for (const std::string& seg : segments) {
        if (seg.empty() || seg == ".") continue;
        if (seg == "..") {
            if (!result.empty() && result.back() != ".." && !is_drive(result.back())) {
                result.pop_back();
            } else if (relative) {
                result.push_back("..");
            }
            continue;
        }
        result.push_back(seg);
    }

    if (result.size() == 1 && is_drive(result[0])) return result[0] + "/";

    std::string out;
    for (size_t i = 0; i < result.size(); ++i) {
        if (i > 0) out += '/';
        out += result[i];
    }
    if (absolute_posix) out = "/" + out;
    return out;
}

std::string path_parent(const std::string& path) {
    const size_t slash = path.rfind('/');
    if (slash == std::string::npos) return "";
    return path.substr(0, slash);
}

std::string path_file_name(const std::string& path) {
    const size_t slash = path.rfind('/');
    if (slash == std::string::npos) return path;
    return path.substr(slash + 1);
}

std::string path_stem(const std::string& path) {
    const std::string name = path_file_name(path);
    const size_t dot = name.rfind('.');
    if (dot == std::string::npos || dot == 0) return name;
    return name.substr(0, dot);
}

std::string path_extension(const std::string& path) {
    const std::string name = path_file_name(path);
    const size_t dot = name.rfind('.');
    if (dot == std::string::npos || dot == 0) return "";
    std::string ext = name.substr(dot);
    for (char& c : ext) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return ext;
}

std::string path_join(const std::string& a, const std::string& b) {
    if (a.empty()) return normalize_path(b);
    return normalize_path(a + "/" + b);
}

}  // namespace pv::core
