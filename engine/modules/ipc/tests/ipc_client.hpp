#pragma once
// Test helper: a framed JSON-RPC client over any ByteStream.
#include <chrono>
#include <deque>
#include <memory>
#include <random>
#include <sstream>
#include <string>

#include "pv/ipc/listeners.hpp"
#include "pv/rpc/framing.hpp"

namespace pv::ipc::testing {

using Json = nlohmann::json;

class TestClient {
public:
    explicit TestClient(std::unique_ptr<rpc::ByteStream> s) : s_(std::move(s)) {}
    bool ok() const { return s_ != nullptr; }
    void send(const Json& message) {
        std::ostringstream out;
        rpc::write_message(out, message.dump());
        const std::string bytes = out.str();
        s_->write_all(bytes.data(), bytes.size());
    }
    // Next message from the server (response or notification); null when the stream closed.
    Json receive() {
        std::string header;
        char c;
        while (header.find("\r\n\r\n") == std::string::npos) {
            if (!next(c)) return nullptr;
            header += c;
        }
        const std::size_t length = std::stoul(header.substr(header.find(':') + 1));
        std::string body;
        while (body.size() < length) {
            if (!next(c)) return nullptr;
            body += c;
        }
        return Json::parse(body);
    }
    // Sends a request and returns its response; notifications that arrive first are kept in `notes`.
    Json call(const std::string& method, const Json& params = Json::object()) {
        const int id = ++id_;
        send(Json{{"jsonrpc", "2.0"}, {"id", id}, {"method", method}, {"params", params}});
        while (true) {
            Json m = receive();
            if (m.is_null()) return m;
            if (m.contains("id") && m["id"] == id) return m;
            notes.push_back(m);
        }
    }
    // Waits for a notification with this method (looks at kept ones first).
    Json wait_note(const std::string& method) {
        for (auto it = notes.begin(); it != notes.end(); ++it) {
            if (it->value("method", "") == method) {
                Json m = *it;
                notes.erase(it);
                return m;
            }
        }
        while (true) {
            Json m = receive();
            if (m.is_null() || m.value("method", "") == method) return m;
            notes.push_back(m);
        }
    }
    void close() { s_->close(); }
    std::deque<Json> notes;

private:
    bool next(char& c) {
        if (pos_ == buf_.size()) {
            buf_.resize(4096);
            const std::size_t n = s_->read_some(buf_.data(), buf_.size());
            if (n == 0) return false;
            buf_.resize(n);
            pos_ = 0;
        }
        c = buf_[pos_++];
        return true;
    }
    std::unique_ptr<rpc::ByteStream> s_;
    std::string buf_;
    std::size_t pos_ = 0;
    int id_ = 0;
};

inline std::string unique_name(const std::string& prefix) {
    std::random_device rd;
    return prefix + std::to_string(rd() % 1000000) + "-" + std::to_string(rd() % 1000000);
}

}  // namespace pv::ipc::testing
