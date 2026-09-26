#include "pv/rpc/connection.hpp"

#include <istream>
#include <sstream>
#include <streambuf>
#include <vector>

#include "pv/core/error.hpp"
#include "pv/rpc/dispatch.hpp"
#include "pv/rpc/framing.hpp"

namespace pv::rpc {

namespace {

// Lets read_message() read from a ByteStream like from any std::istream.
class StreamReadBuf : public std::streambuf {
public:
    explicit StreamReadBuf(ByteStream& s) : stream_(s), buf_(64 * 1024) {}

protected:
    int_type underflow() override {
        if (gptr() < egptr()) return traits_type::to_int_type(*gptr());
        std::size_t n = 0;
        try {
            n = stream_.read_some(buf_.data(), buf_.size());
        } catch (...) {
            n = 0;
        }
        if (n == 0) return traits_type::eof();
        setg(buf_.data(), buf_.data(), buf_.data() + n);
        return traits_type::to_int_type(*gptr());
    }

private:
    ByteStream& stream_;
    std::vector<char> buf_;
};

}  // namespace

Connection::Connection(std::unique_ptr<ByteStream> stream, std::mutex& dispatch_mutex, Gate gate)
    : stream_(std::move(stream)), dispatch_mutex_(dispatch_mutex), gate_(std::move(gate)) {}

int Connection::run(const MethodTable& table) {
    StreamReadBuf buf(*stream_);
    std::istream in(&buf);
    while (!closed_) {
        std::optional<std::string> body;
        try {
            body = read_message(in);
        } catch (const core::PvError& e) {
            if (closed_) return 0;
            send(make_error_response(nullptr, core::err::ParseError, e.what()));
            return 1;
        }
        if (!body) return 0;

        Json request;
        try {
            request = Json::parse(*body);
        } catch (const nlohmann::json::exception&) {
            send(make_error_response(nullptr, core::err::ParseError, "parse error"));
            continue;
        }
        if (gate_) {
            if (auto rejected = gate_(request)) {
                if (request.is_object() && request.contains("id")) {
                    send(Json{{"jsonrpc", "2.0"}, {"id", request["id"]}, {"error", *rejected}});
                }
                continue;
            }
        }
        Json response;
        {
            std::lock_guard<std::mutex> lock(dispatch_mutex_);
            response = handle_request(table, request);
        }
        if (!response.is_null()) send(response);
    }
    return 0;
}

void Connection::notify(const std::string& method, const Json& params) {
    send(Json{{"jsonrpc", "2.0"}, {"method", method}, {"params", params}});
}

void Connection::close() {
    if (closed_.exchange(true)) return;
    stream_->close();
}

void Connection::send(const Json& message) {
    if (closed_) throw core::PvError(core::err::Io, "connection closed");
    std::ostringstream framed;
    write_message(framed, message.dump());
    const std::string bytes = framed.str();
    std::lock_guard<std::mutex> lock(write_mutex_);
    stream_->write_all(bytes.data(), bytes.size());
}

}  // namespace pv::rpc
