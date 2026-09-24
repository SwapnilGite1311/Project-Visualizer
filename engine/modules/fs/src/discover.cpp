#include <algorithm>
#include <filesystem>
#include <fstream>

#include "pv/core/error.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"
#include "pv/fs/fs.hpp"

namespace pv::fs {

namespace {

namespace stdfs = std::filesystem;

stdfs::path to_fs_path(const std::string& utf8) {
    return stdfs::path(std::u8string(reinterpret_cast<const char8_t*>(utf8.data()), utf8.size()));
}

std::string to_utf8(const stdfs::path& p) {
    const std::u8string s = p.generic_u8string();
    return std::string(reinterpret_cast<const char*>(s.data()), s.size());
}

std::string read_prefix(const stdfs::path& p, std::size_t max_bytes) {
    std::ifstream in(p, std::ios::binary);
    std::string buffer(max_bytes, '\0');
    in.read(buffer.data(), static_cast<std::streamsize>(max_bytes));
    buffer.resize(static_cast<std::size_t>(in.gcount()));
    return buffer;
}

void add_gitignore(GitIgnore& gitignore, const stdfs::path& dir, const std::string& dir_rel) {
    const stdfs::path file = dir / ".gitignore";
    std::error_code ec;
    if (!stdfs::is_regular_file(file, ec)) return;
    gitignore.add_file(dir_rel, core::read_file_text(to_utf8(file)));
}

}  // namespace

DiscoverResult discover_files(const std::string& root, const DiscoverOptions& options) {
    const stdfs::path root_path = to_fs_path(root);
    std::error_code ec;
    if (!stdfs::is_directory(root_path, ec)) throw core::PvError(core::err::Io, "folder not found: " + root);
    const std::string root_n = core::normalize_path(root);

    std::vector<std::string> exclude_globs = default_excludes();
    exclude_globs.insert(exclude_globs.end(), options.exclude_globs.begin(), options.exclude_globs.end());
    const GlobSet excludes(exclude_globs);

    GitIgnore gitignore;
    if (options.use_gitignore) add_gitignore(gitignore, root_path, "");

    DiscoverResult result;
    const auto dir_options = stdfs::directory_options::skip_permission_denied;
    for (auto it = stdfs::recursive_directory_iterator(root_path, dir_options, ec);
         it != stdfs::recursive_directory_iterator(); it.increment(ec)) {
        if (ec) break;
        const stdfs::directory_entry& entry = *it;
        const std::string abs = core::normalize_path(to_utf8(entry.path()));
        const auto rel_opt = core::path_relative_to(root_n, abs);
        if (!rel_opt) continue;
        const std::string rel = *rel_opt;

        std::error_code type_ec;
        if (entry.is_directory(type_ec)) {
            if (excludes.matches(rel + "/") || (options.use_gitignore && gitignore.ignored(rel, true))) {
                it.disable_recursion_pending();
                continue;
            }
            if (options.use_gitignore) add_gitignore(gitignore, entry.path(), rel);
            continue;
        }
        if (!entry.is_regular_file(type_ec)) continue;

        const std::string ext = core::path_extension(rel);
        if (!options.extensions.empty() &&
            std::find(options.extensions.begin(), options.extensions.end(), ext) == options.extensions.end()) {
            continue;
        }
        if (excludes.matches(rel)) continue;
        if (options.use_gitignore && gitignore.ignored(rel, false)) continue;

        const std::uintmax_t size = entry.file_size(type_ec);
        if (size > options.max_file_bytes) {
            result.skipped.push_back(rel + " (too large)");
            continue;
        }
        if (looks_binary(read_prefix(entry.path(), 8000))) {
            result.skipped.push_back(rel + " (binary)");
            continue;
        }
        result.files.push_back(DiscoveredFile{rel, abs, size});
    }

    std::sort(result.files.begin(), result.files.end(),
              [](const DiscoveredFile& a, const DiscoveredFile& b) { return a.rel_path < b.rel_path; });
    std::sort(result.skipped.begin(), result.skipped.end());
    return result;
}

}  // namespace pv::fs
