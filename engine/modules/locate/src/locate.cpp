#include "pv/locate/locate.hpp"

#include <algorithm>
#include <cctype>
#include <filesystem>
#include <mutex>
#include <unordered_map>

#include "pv/core/paths.hpp"

namespace pv::locate {

namespace {

namespace stdfs = std::filesystem;

constexpr std::size_t kCanonicalCacheMax = 20000;

// The same folder can be written differently: Windows short names ("C:/Users/SWAPNI~1/...") or symlinks.
// Returns the resolved form (long names, links followed) with forward slashes; "" when it cannot be resolved. Cached.
std::string canonical_form(const std::string& path) {
    static std::mutex mutex;
    static std::unordered_map<std::string, std::string> cache;
    {
        std::lock_guard lock(mutex);
        if (const auto it = cache.find(path); it != cache.end()) return it->second;
    }
    std::error_code ec;
    const stdfs::path fs_path(std::u8string(reinterpret_cast<const char8_t*>(path.data()), path.size()));
    const stdfs::path resolved = stdfs::weakly_canonical(fs_path, ec);
    std::string out;
    if (!ec) {
        const std::u8string s = resolved.generic_u8string();
        out = core::normalize_path(std::string(reinterpret_cast<const char*>(s.data()), s.size()));
    }
    std::lock_guard lock(mutex);
    if (cache.size() > kCanonicalCacheMax) cache.clear();
    cache.emplace(path, out);
    return out;
}

}  // namespace

std::optional<std::string> to_project_relative(const std::string& root_path, const std::string& file_path) {
    const std::string p = core::normalize_path(file_path);
    const bool drive = p.size() >= 2 && std::isalpha(static_cast<unsigned char>(p[0])) && p[1] == ':';
    if (p.empty() || (p[0] != '/' && !drive)) return p;
    if (auto rel = core::path_relative_to(root_path, p)) return rel;
    const std::string root = canonical_form(root_path);
    const std::string file = canonical_form(p);
    if (root.empty() || file.empty()) return std::nullopt;
    return core::path_relative_to(root, file);
}

const core::Node* node_at(const graph::Graph& g, const std::string& rel_path, int line) {
    return g.innermost_at(rel_path, line);
}

std::vector<const core::Node*> file_nodes(const graph::Graph& g, const std::string& rel_path) {
    std::vector<const core::Node*> nodes = g.nodes_in_file(rel_path);
    std::sort(nodes.begin(), nodes.end(), [](const core::Node* a, const core::Node* b) {
        if (a->span.start_line != b->span.start_line) return a->span.start_line < b->span.start_line;
        return a->id < b->id;
    });
    return nodes;
}

}  // namespace pv::locate
