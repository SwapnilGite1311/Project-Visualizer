#include <algorithm>
#include <chrono>
#include <filesystem>

#include "pv/fs/fs.hpp"
#include "pv/incremental/incremental.hpp"

namespace pv::incremental {

bool ChangeSet::empty() const { return added.empty() && modified.empty() && removed.empty(); }

StateMap scan_states(const std::string& root, const parse::AdapterRegistry& adapters, const std::vector<std::string>& excludes) {
    fs::DiscoverOptions options;
    options.extensions = adapters.all_extensions();
    options.exclude_globs = excludes;
    StateMap states;
    for (const fs::DiscoveredFile& f : fs::discover_files(root, options).files) {
        std::error_code ec;
        const std::filesystem::path path(std::u8string(reinterpret_cast<const char8_t*>(f.abs_path.data()), f.abs_path.size()));
        const auto time = std::filesystem::last_write_time(path, ec);
        FileState state;
        state.size = f.size;
        if (!ec) state.mtime_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(time.time_since_epoch()).count();
        states.emplace(f.rel_path, state);
    }
    return states;
}

ChangeSet diff_states(const StateMap& before, const StateMap& after) {
    ChangeSet changes;
    for (const auto& [path, state] : after) {
        const auto it = before.find(path);
        if (it == before.end()) changes.added.push_back(path);
        else if (it->second.mtime_ns != state.mtime_ns || it->second.size != state.size) changes.modified.push_back(path);
    }
    for (const auto& [path, state] : before) {
        if (!after.count(path)) changes.removed.push_back(path);
    }
    return changes;  // std::map keys are already sorted
}

}  // namespace pv::incremental
