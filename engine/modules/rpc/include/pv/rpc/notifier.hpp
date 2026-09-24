#pragma once
#include <mutex>
#include <string>
#include <utility>
#include <vector>
#include <nlohmann/json.hpp>

namespace pv::rpc {
using Json = nlohmann::json;

class Notifier {
public:
    virtual ~Notifier() = default;
    virtual void notify(const std::string& method, const Json& params) = 0;
};

class NullNotifier : public Notifier {
public:
    void notify(const std::string& method, const Json& params) override;
};

class RecordingNotifier : public Notifier {
public:
    void notify(const std::string& method, const Json& params) override;
    std::vector<std::pair<std::string, Json>> items() const;  // copy, thread-safe
private:
    mutable std::mutex mutex_;
    std::vector<std::pair<std::string, Json>> items_;
};
}  // namespace pv::rpc
