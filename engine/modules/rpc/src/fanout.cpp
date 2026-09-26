#include "pv/rpc/fanout.hpp"

#include <algorithm>

namespace pv::rpc {

int FanoutNotifier::add(Notifier* sink) {
    std::lock_guard<std::mutex> lock(mutex_);
    const int id = next_id_++;
    sinks_.emplace_back(id, sink);
    return id;
}

void FanoutNotifier::remove(int id) {
    std::lock_guard<std::mutex> lock(mutex_);
    sinks_.erase(std::remove_if(sinks_.begin(), sinks_.end(), [id](const auto& s) { return s.first == id; }), sinks_.end());
}

std::size_t FanoutNotifier::size() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return sinks_.size();
}

void FanoutNotifier::notify(const std::string& method, const Json& params) {
    std::vector<std::pair<int, Notifier*>> sinks;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        sinks = sinks_;
    }
    for (const auto& [id, sink] : sinks) {
        try {
            sink->notify(method, params);
        } catch (...) {
            remove(id);  // a closed connection must not stop the others
        }
    }
}

}  // namespace pv::rpc
