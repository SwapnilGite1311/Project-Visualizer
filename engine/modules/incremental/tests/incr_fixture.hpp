#pragma once
// Test helpers: a writable copy of the Python fixture project, and small file edits.
#include <chrono>
#include <filesystem>
#include <fstream>
#include <random>
#include <sstream>
#include <string>

#include "pv/core/paths.hpp"
#include "pv/session/test_env.hpp"

namespace pv::incremental::testing {

namespace stdfs = std::filesystem;

inline stdfs::path to_path(const std::string& utf8) {
    return stdfs::path(std::u8string(reinterpret_cast<const char8_t*>(utf8.data()), utf8.size()));
}

inline std::string from_path(const stdfs::path& p) {
    const std::u8string s = p.generic_u8string();
    return std::string(reinterpret_cast<const char*>(s.data()), s.size());
}

// A fresh temp folder, removed when the object goes away.
struct TempDir {
    stdfs::path path;
    TempDir() {
        std::random_device rd;
        path = stdfs::temp_directory_path() / ("pv-incr-" + std::to_string(rd()) + std::to_string(rd()));
        stdfs::create_directories(path);
    }
    ~TempDir() {
        std::error_code ec;
        stdfs::remove_all(path, ec);
    }
    std::string str() const { return core::normalize_path(from_path(path)); }
};

inline void copy_fixture(const TempDir& dir) {
    stdfs::copy(to_path(session::pyproj_small_path()), dir.path, stdfs::copy_options::recursive);
}

inline std::string read_text(const stdfs::path& p) {
    std::ifstream in(p, std::ios::binary);
    std::stringstream ss;
    ss << in.rdbuf();
    return ss.str();
}

// Writes the file and moves its modification time forward, so a change is seen even within the clock's resolution.
inline void write_text(const stdfs::path& p, const std::string& text) {
    std::ofstream(p, std::ios::binary | std::ios::trunc) << text;
    std::error_code ec;
    const auto t = stdfs::last_write_time(p, ec);
    if (!ec) stdfs::last_write_time(p, t + std::chrono::seconds(2), ec);
}

inline void replace_in_file(const stdfs::path& p, const std::string& from, const std::string& to) {
    std::string text = read_text(p);
    for (std::size_t pos = 0; (pos = text.find(from, pos)) != std::string::npos; pos += to.size()) text.replace(pos, from.size(), to);
    write_text(p, text);
}

}  // namespace pv::incremental::testing
