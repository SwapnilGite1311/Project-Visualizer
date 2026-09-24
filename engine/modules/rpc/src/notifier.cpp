#include "pv/rpc/notifier.hpp"

namespace pv::rpc {

void NullNotifier::notify(const std::string& method, const Json& params) {
    (void)method;
    (void)params;
}

void RecordingNotifier::notify(const std::string& method, const Json& params) {
    std::lock_guard<std::mutex> lock(mutex_);
    items_.emplace_back(method, params);
}

std::vector<std::pair<std::string, Json>> RecordingNotifier::items() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return items_;
}

}  // namespace pv::rpc
