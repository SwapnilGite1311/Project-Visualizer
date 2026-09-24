#pragma once
#include <cstdint>
#include <regex>
#include <string>
#include <vector>

namespace pv::fs {

std::string glob_to_regex(const std::string& glob);
bool glob_match(const std::string& glob, const std::string& path);

class GlobSet {
public:
    explicit GlobSet(const std::vector<std::string>& globs);
    bool matches(const std::string& path) const;
private:
    std::vector<std::regex> regexes_;
};

std::vector<std::string> default_excludes();
bool looks_binary(const std::string& first_bytes);

class GitIgnore {
public:
    void add_file(const std::string& dir_rel, const std::string& content);
    bool ignored(const std::string& rel_path, bool is_dir) const;
private:
    struct Rule { std::regex self; std::regex inside; bool negate = false; bool dir_only = false; };
    std::vector<Rule> rules_;
};

struct DiscoverOptions {
    std::vector<std::string> extensions;      // lower-case with dot, e.g. ".py"; empty = all files
    std::vector<std::string> exclude_globs;   // extra user excludes (relative paths)
    std::uintmax_t max_file_bytes = 2 * 1024 * 1024;
    bool use_gitignore = true;
};
struct DiscoveredFile {
    std::string rel_path;   // normalized, relative to root
    std::string abs_path;   // normalized absolute path
    std::uintmax_t size = 0;
};
struct DiscoverResult {
    std::vector<DiscoveredFile> files;   // sorted by rel_path
    std::vector<std::string> skipped;    // "<rel_path> (too large)" or "<rel_path> (binary)", sorted
};
DiscoverResult discover_files(const std::string& root, const DiscoverOptions& options);

}  // namespace pv::fs
