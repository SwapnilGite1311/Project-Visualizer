#pragma once
// Test helpers: a temporary PV_DATA_DIR and small mapped runtime events.
#include <cstdlib>
#include <filesystem>
#include <random>
#include <string>

#include "pv/metrics/recorder.hpp"

namespace pv::metrics::testing {

inline void set_env(const char* name, const std::string& value) {
#ifdef _WIN32
    _putenv_s(name, value.c_str());
#else
    if (value.empty()) unsetenv(name);
    else setenv(name, value.c_str(), 1);
#endif
}

struct DataDir {
    std::filesystem::path dir;
    DataDir() {
        std::random_device rd;
        dir = std::filesystem::temp_directory_path() / ("pv-metrics-" + std::to_string(rd()) + std::to_string(rd()));
        std::filesystem::create_directories(dir);
        set_env("PV_DATA_DIR", dir.generic_string());
        recorder().reset_for_tests();
    }
    ~DataDir() {
        recorder().reset_for_tests();  // closes the databases before the folder goes away
        set_env("PV_DATA_DIR", "");
        std::error_code ec;
        std::filesystem::remove_all(dir, ec);
    }
    std::string db(const std::string& name) const { return (dir / name).generic_string(); }
};

constexpr int64_t kMinuteNs = 60LL * 1000 * 1000 * 1000;

inline runtime::MappedEvent mapped(const std::string& node, int64_t minute, double ms, const std::string& status = "ok",
                                   const std::string& kind = "call") {
    runtime::MappedEvent m;
    m.node_id = node;
    m.ev.kind = kind;
    m.ev.status = status;
    m.ev.start_ns = minute * kMinuteNs + 1000;
    m.ev.duration_ns = static_cast<int64_t>(ms * 1e6);
    return m;
}

}  // namespace pv::metrics::testing
