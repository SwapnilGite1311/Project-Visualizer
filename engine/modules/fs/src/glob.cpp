#include <string>

#include "pv/fs/fs.hpp"

namespace pv::fs {

std::string glob_to_regex(const std::string& glob) {
    const std::string special = ".+()^$|[]{}\\";
    std::string out = "^";
    size_t i = 0;
    while (i < glob.size()) {
        if (glob.compare(i, 3, "**/") == 0) {
            out += "(?:.*/)?";
            i += 3;
        } else if (glob.compare(i, 2, "**") == 0) {
            out += ".*";
            i += 2;
        } else if (glob[i] == '*') {
            out += "[^/]*";
            i += 1;
        } else if (glob[i] == '?') {
            out += "[^/]";
            i += 1;
        } else {
            if (special.find(glob[i]) != std::string::npos) out += '\\';
            out += glob[i];
            i += 1;
        }
    }
    out += "$";
    return out;
}

bool glob_match(const std::string& glob, const std::string& path) {
    return std::regex_match(path, std::regex(glob_to_regex(glob)));
}

GlobSet::GlobSet(const std::vector<std::string>& globs) {
    regexes_.reserve(globs.size());
    for (const std::string& g : globs) regexes_.emplace_back(glob_to_regex(g));
}

bool GlobSet::matches(const std::string& path) const {
    for (const std::regex& r : regexes_) {
        if (std::regex_match(path, r)) return true;
    }
    return false;
}

}  // namespace pv::fs
