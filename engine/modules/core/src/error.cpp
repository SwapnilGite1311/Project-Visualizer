#include "pv/core/error.hpp"

namespace pv::core {

PvError::PvError(int code, const std::string& message) : std::runtime_error(message), code_(code) {}

int PvError::code() const noexcept {
    return code_;
}

}  // namespace pv::core
