#pragma once
#include <stdexcept>
#include <string>

namespace pv::core {

namespace err {
inline constexpr int ParseError = -32700;
inline constexpr int InvalidRequest = -32600;
inline constexpr int MethodNotFound = -32601;
inline constexpr int InvalidParams = -32602;
inline constexpr int Internal = -32603;
inline constexpr int ProjectNotFound = -32001;
inline constexpr int NodeNotFound = -32002;
inline constexpr int NotReady = -32003;
inline constexpr int Io = -32004;
inline constexpr int Unsupported = -32005;
inline constexpr int Cancelled = -32006;
inline constexpr int Conflict = -32007;
}  // namespace err

class PvError : public std::runtime_error {
public:
    PvError(int code, const std::string& message);
    int code() const noexcept;

private:
    int code_;
};

}  // namespace pv::core
