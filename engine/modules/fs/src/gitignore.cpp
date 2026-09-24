#include "pv/core/text.hpp"
#include "pv/fs/fs.hpp"

namespace pv::fs {

void GitIgnore::add_file(const std::string& dir_rel, const std::string& content) {
    for (std::string line : core::split(content, '\n')) {
        line = core::trim(line);
        if (line.empty() || line[0] == '#') continue;
        Rule rule;
        if (line[0] == '!') {
            rule.negate = true;
            line = line.substr(1);
        }
        if (!line.empty() && line.back() == '/') {
            rule.dir_only = true;
            line.pop_back();
        }
        bool anchored = false;
        if (!line.empty() && line[0] == '/') {
            anchored = true;
            line = line.substr(1);
        }
        if (line.find('/') != std::string::npos) anchored = true;
        if (line.empty()) continue;
        const std::string prefix = dir_rel.empty() ? "" : dir_rel + "/";
        const std::string glob = anchored ? prefix + line : prefix + "**/" + line;
        rule.self = std::regex(glob_to_regex(glob));
        rule.inside = std::regex(glob_to_regex(glob + "/**"));
        rules_.push_back(std::move(rule));
    }
}

bool GitIgnore::ignored(const std::string& rel_path, bool is_dir) const {
    bool result = false;
    for (const Rule& rule : rules_) {
        const bool match = std::regex_match(rel_path, rule.inside) ||
                           ((!rule.dir_only || is_dir) && std::regex_match(rel_path, rule.self));
        if (match) result = !rule.negate;
    }
    return result;
}

}  // namespace pv::fs
