#include "pv/core/log.hpp"

#include <iostream>
#include <mutex>

namespace pv::core {

namespace {

std::mutex g_mutex;
LogLevel g_level = LogLevel::Info;
std::ostream* g_stream = nullptr;

const char* level_name(LogLevel level) {
    switch (level) {
        case LogLevel::Debug: return "DEBUG";
        case LogLevel::Info: return "INFO";
        case LogLevel::Warn: return "WARN";
        case LogLevel::Error: return "ERROR";
    }
    return "INFO";
}

void write(LogLevel level, const std::string& message) {
    std::lock_guard<std::mutex> lock(g_mutex);
    if (static_cast<int>(level) < static_cast<int>(g_level)) return;
    std::ostream& out = g_stream ? *g_stream : std::cerr;
    out << "[pv-engine] " << level_name(level) << " " << message << "\n";
    out.flush();
}

}  // namespace

void set_log_level(LogLevel level) {
    std::lock_guard<std::mutex> lock(g_mutex);
    g_level = level;
}

void set_log_stream(std::ostream* out) {
    std::lock_guard<std::mutex> lock(g_mutex);
    g_stream = out;
}

void log_debug(const std::string& message) { write(LogLevel::Debug, message); }
void log_info(const std::string& message) { write(LogLevel::Info, message); }
void log_warn(const std::string& message) { write(LogLevel::Warn, message); }
void log_error(const std::string& message) { write(LogLevel::Error, message); }

}  // namespace pv::core
