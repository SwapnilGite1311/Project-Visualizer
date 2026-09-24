#include "pv/rpc/dispatch.hpp"

#include "pv/core/error.hpp"

namespace pv::rpc {

Json make_error_response(const Json& id, int code, const std::string& message) {
    return Json{{"jsonrpc", "2.0"}, {"id", id}, {"error", Json{{"code", code}, {"message", message}}}};
}

Json handle_request(const MethodTable& table, const Json& request) {
    if (!request.is_object()) return make_error_response(nullptr, core::err::InvalidRequest, "invalid request");

    const bool is_notification = !request.contains("id");
    const Json id = is_notification ? Json(nullptr) : request["id"];

    const bool bad_version = !request.contains("jsonrpc") || !request["jsonrpc"].is_string() ||
                             request["jsonrpc"].get<std::string>() != "2.0";
    if (bad_version || !request.contains("method") || !request["method"].is_string()) {
        if (is_notification) return Json();
        return make_error_response(id, core::err::InvalidRequest, "invalid request");
    }
    const std::string method = request["method"].get<std::string>();
    const Json params =
        request.contains("params") && !request["params"].is_null() ? request["params"] : Json::object();

    try {
        Json result = table.call(method, params);
        if (is_notification) return Json();
        return Json{{"jsonrpc", "2.0"}, {"id", id}, {"result", result}};
    } catch (const core::PvError& e) {
        if (is_notification) return Json();
        return make_error_response(id, e.code(), e.what());
    } catch (const nlohmann::json::exception& e) {
        if (is_notification) return Json();
        return make_error_response(id, core::err::InvalidParams, e.what());
    } catch (const std::exception& e) {
        if (is_notification) return Json();
        return make_error_response(id, core::err::Internal, e.what());
    }
}

}  // namespace pv::rpc
