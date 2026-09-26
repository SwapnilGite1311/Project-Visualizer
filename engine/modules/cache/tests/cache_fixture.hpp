#pragma once
// Test helper: points PV_CACHE_DIR at a fresh temp folder and turns the builder hook off again afterwards.
#include <cstdlib>
#include <filesystem>
#include <random>
#include <string>

#include "pv/builder/extraction_cache.hpp"

namespace pv::cache::testing {

inline void set_env(const char* name, const std::string& value) {
#ifdef _WIN32
    _putenv_s(name, value.c_str());
#else
    if (value.empty()) unsetenv(name);
    else setenv(name, value.c_str(), 1);
#endif
}

struct CacheDirScope {
    std::filesystem::path dir;
    CacheDirScope() {
        std::random_device rd;
        dir = std::filesystem::temp_directory_path() / ("pv-cache-" + std::to_string(rd()) + std::to_string(rd()));
        set_env("PV_CACHE_DIR", dir.generic_string());
    }
    ~CacheDirScope() {
        builder::set_extraction_cache(nullptr);
        set_env("PV_CACHE_DIR", "");
        std::error_code ec;
        std::filesystem::remove_all(dir, ec);
    }
};

}  // namespace pv::cache::testing
