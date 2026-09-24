#include "pv/rpc/server.hpp"

#include "pv/core/error.hpp"
#include "pv/rpc/dispatch.hpp"
#include "pv/rpc/framing.hpp"

namespace pv::rpc {

StdioServer::StdioServer(std::istream& in, std::ostream& out) : in_(in), out_(out) {}

void StdioServer::notify(const std::string& method, const Json& params) {
    send(Json{{"jsonrpc", "2.0"}, {"method", method}, {"params", params}});
}

int StdioServer::run(const MethodTable& table) {
    while (true) {
        std::optional<std::string> body;
        try {
            body = read_message(in_);
        } catch (const core::PvError& e) {
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
        const Json response = handle_request(table, request);
        if (!response.is_null()) send(response);
        if (stop_) return 0;
    }
}

void StdioServer::request_stop() {
    stop_ = true;
}

void StdioServer::send(const Json& message) {
    std::lock_guard<std::mutex> lock(write_mutex_);
    write_message(out_, message.dump());
}

}  // namespace pv::rpc
