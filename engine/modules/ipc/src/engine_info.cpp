#include "pv/ipc/engine_info.hpp"

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#else
#include <signal.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

#include <cerrno>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <random>
#include <sstream>

namespace pv::ipc {

namespace {

std::filesystem::path to_fs(const std::string& utf8) {
    return std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(utf8.data()), utf8.size()));
}

std::string env(const char* name) {
#ifdef _WIN32
    char* value = nullptr;
    std::size_t len = 0;
    if (_dupenv_s(&value, &len, name) != 0 || !value) return "";
    std::string out(value);
    std::free(value);
    return out;
#else
    const char* v = std::getenv(name);
    return v ? v : "";
#endif
}

}  // namespace

nlohmann::json info_to_json(const EngineInfo& info) {
    return {{"pid", info.pid},
            {"version", info.version},
            {"pipe", info.pipe},
            {"tcp_port", info.tcp_port == 0 ? nlohmann::json(nullptr) : nlohmann::json(info.tcp_port)},
            {"token", info.token}};
}

std::string random_token() {
    std::random_device rd;
    static const char* digits = "0123456789abcdef";
    std::string out;
    out.reserve(64);
    for (int i = 0; i < 16; ++i) {
        unsigned v = rd();
        for (int k = 0; k < 4; ++k) {
            out += digits[v & 0xF];
            v >>= 4;
        }
    }
    return out;
}

std::string pv_home() {
    const std::string override_dir = env("PV_HOME");
    if (!override_dir.empty()) return override_dir;
#ifdef _WIN32
    std::string home = env("USERPROFILE");
#else
    std::string home = env("HOME");
#endif
    if (home.empty()) home = std::filesystem::temp_directory_path().generic_string();
    return home + "/.project-visualizer";
}

std::string info_path() {
    return pv_home() + "/engine.json";
}

void write_info(const EngineInfo& info) {
    std::error_code ec;
    std::filesystem::create_directories(to_fs(pv_home()), ec);
    const std::string target = info_path();
    const std::string temp = target + ".tmp" + std::to_string(info.pid);
    {
        std::ofstream out(to_fs(temp), std::ios::binary | std::ios::trunc);
        out << info_to_json(info).dump(2) << "\n";
    }
#ifndef _WIN32
    ::chmod(temp.c_str(), 0600);  // the token must stay private (Windows: the user profile is already private)
#endif
    std::filesystem::rename(to_fs(temp), to_fs(target), ec);
    if (ec) std::filesystem::remove(to_fs(temp), ec);
}

std::optional<EngineInfo> read_info() {
    std::ifstream in(to_fs(info_path()), std::ios::binary);
    if (!in) return std::nullopt;
    try {
        std::stringstream ss;
        ss << in.rdbuf();
        const auto j = nlohmann::json::parse(ss.str());
        EngineInfo info;
        info.pid = j.value("pid", 0);
        info.version = j.value("version", "");
        info.pipe = j.value("pipe", "");
        info.tcp_port = j.contains("tcp_port") && j["tcp_port"].is_number_integer() ? j["tcp_port"].get<int>() : 0;
        info.token = j.value("token", "");
        return info;
    } catch (const std::exception&) {
        return std::nullopt;
    }
}

void remove_info(int pid) {
    const auto info = read_info();
    if (!info || info->pid != pid) return;  // another engine wrote it since
    std::error_code ec;
    std::filesystem::remove(to_fs(info_path()), ec);
}

int current_pid() {
#ifdef _WIN32
    return static_cast<int>(GetCurrentProcessId());
#else
    return static_cast<int>(::getpid());
#endif
}

bool process_alive(int pid) {
    if (pid <= 0) return false;
#ifdef _WIN32
    HANDLE h = OpenProcess(SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION, FALSE, static_cast<DWORD>(pid));
    if (!h) return false;
    const bool alive = WaitForSingleObject(h, 0) == WAIT_TIMEOUT;
    CloseHandle(h);
    return alive;
#else
    return ::kill(pid, 0) == 0 || errno == EPERM;
#endif
}

}  // namespace pv::ipc
