#include <algorithm>
#include <filesystem>

#include "pv/core/log.hpp"
#include "pv/plugins/plugins.hpp"
#include "pv/session/registry.hpp"

namespace {

std::filesystem::path to_path(const std::string& utf8) {
    return std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(utf8.data()), utf8.size()));
}

std::string from_path(const std::filesystem::path& p) {
    const std::u8string s = p.generic_u8string();
    return std::string(reinterpret_cast<const char*>(s.data()), s.size());
}

}  // namespace

// Loads every language plugin folder (one with a language.json) found in the plugin roots at engine start.
// A broken plugin is skipped with a warning; one that claims a built-in language's id or extension is refused by the registry.
void pv_register_plugins(pv::session::Registry& reg) {
    for (const std::string& root : pv::plugins::plugin_roots()) {
        std::error_code ec;
        if (!std::filesystem::is_directory(to_path(root), ec)) continue;
        std::vector<std::string> dirs;
        for (const auto& entry : std::filesystem::directory_iterator(to_path(root), ec)) {
            if (entry.is_directory(ec) && std::filesystem::is_regular_file(entry.path() / "language.json", ec)) dirs.push_back(from_path(entry.path()));
        }
        std::sort(dirs.begin(), dirs.end());
        for (const std::string& dir : dirs) {
            try {
                auto adapter = pv::plugins::load_plugin(dir);
                const std::string id = adapter->id();
                reg.adapters.add(std::move(adapter));
                pv::core::log_info("language plugin loaded: " + id);
            } catch (const std::exception& e) {
                pv::core::log_warn("language plugin skipped: " + dir + ": " + e.what());
            }
        }
    }
}
