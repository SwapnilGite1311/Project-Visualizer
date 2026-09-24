#pragma once
#include <atomic>
#include <istream>
#include <mutex>
#include <ostream>
#include <string>

#include "pv/rpc/method_table.hpp"
#include "pv/rpc/notifier.hpp"

namespace pv::rpc {

class StdioServer : public Notifier {
public:
    StdioServer(std::istream& in, std::ostream& out);
    void notify(const std::string& method, const Json& params) override;  // thread-safe
    int run(const MethodTable& table);   // returns 0 on EOF or stop, 1 on a framing error
    void request_stop();                 // thread-safe; loop ends after the current message
private:
    void send(const Json& message);
    std::istream& in_;
    std::ostream& out_;
    std::mutex write_mutex_;
    std::atomic<bool> stop_{false};
};

}  // namespace pv::rpc
