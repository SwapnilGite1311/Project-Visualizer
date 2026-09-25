#pragma once
#include <cstdint>
#include <optional>
#include <string>

#include <nlohmann/json.hpp>

namespace pv::runtime {

struct EventError {
    std::string type;
    std::string message;
    std::string stack;
};

// One runtime event (card R12, contracts/events/runtime-event.schema.json).
struct RuntimeEvent {
    std::string event_id, trace_id, span_id, parent_span_id, kind, name, file_path, status, service;
    int line = 0;
    int64_t start_ns = 0;
    int64_t duration_ns = 0;
    std::optional<EventError> error;
    nlohmann::json attrs = nlohmann::json::object();
};

RuntimeEvent event_from_json(const nlohmann::json& j);  // throws PvError(err::InvalidParams, "<reason>")
nlohmann::json event_to_json(const RuntimeEvent& e);
bool is_error_event(const RuntimeEvent& e);  // status == "error" || kind == "error"

}  // namespace pv::runtime
