#pragma once
#include <ostream>
#include <string>

namespace pv::core {
enum class LogLevel { Debug, Info, Warn, Error };
void set_log_level(LogLevel level);   // default Info
void set_log_stream(std::ostream* out); // default &std::cerr; nullptr restores std::cerr
void log_debug(const std::string& message);
void log_info(const std::string& message);
void log_warn(const std::string& message);
void log_error(const std::string& message);
}  // namespace pv::core
