#pragma once
#include <atomic>
#include <cstddef>
#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <string>

#include "pv/rpc/method_table.hpp"
#include "pv/rpc/notifier.hpp"

namespace pv::rpc {

// A bidirectional byte stream (named pipe, Unix socket, TCP socket, or an in-memory pair in tests).
struct ByteStream {
    virtual ~ByteStream() = default;
    virtual std::size_t read_some(char* buf, std::size_t n) = 0;  // blocks; 0 = closed
    virtual void write_all(const char* data, std::size_t n) = 0;  // throws when the peer is gone
    virtual void close() = 0;                                      // unblocks a pending read_some
};

// One client of the engine: reads framed JSON-RPC requests from a ByteStream and answers them.
// Requests of all connections pass one shared dispatch mutex, so handlers still run one at a time.
class Connection : public Notifier {
public:
    // Called for each request before dispatch; returning an error object (JSON-RPC "error" member) rejects it.
    using Gate = std::function<std::optional<Json>(const Json& request)>;

    Connection(std::unique_ptr<ByteStream> stream, std::mutex& dispatch_mutex, Gate gate = {});
    int run(const MethodTable& table);  // 0 when the stream closes, 1 on a framing error
    void notify(const std::string& method, const Json& params) override;  // thread-safe
    void close();

private:
    void send(const Json& message);
    std::unique_ptr<ByteStream> stream_;
    std::mutex& dispatch_mutex_;
    Gate gate_;
    std::mutex write_mutex_;
    std::atomic<bool> closed_{false};
};

}  // namespace pv::rpc
