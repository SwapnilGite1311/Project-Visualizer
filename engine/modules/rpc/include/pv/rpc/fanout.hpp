#pragma once
#include <cstddef>
#include <mutex>
#include <string>
#include <utility>
#include <vector>

#include "pv/rpc/notifier.hpp"

namespace pv::rpc {

// Sends every notification to all registered sinks (the stdio server, pipe and TCP connections).
class FanoutNotifier : public Notifier {
public:
    int add(Notifier* sink);  // returns an id for remove()
    void remove(int id);
    std::size_t size() const;
    void notify(const std::string& method, const Json& params) override;  // thread-safe; a sink that throws is removed

private:
    mutable std::mutex mutex_;
    std::vector<std::pair<int, Notifier*>> sinks_;
    int next_id_ = 1;
};

}  // namespace pv::rpc
