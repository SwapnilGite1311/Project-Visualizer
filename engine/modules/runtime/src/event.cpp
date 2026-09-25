#include "pv/runtime/event.hpp"

#include <set>

#include "pv/core/error.hpp"

namespace pv::runtime {
namespace {

constexpr std::size_t kMaxText = 4096;
constexpr std::size_t kMaxStack = 16384;
const std::set<std::string> kKinds{"call", "http_in", "http_out", "db_query", "message", "error", "stall", "log"};

[[noreturn]] void invalid(const std::string& reason) { throw core::PvError(core::err::InvalidParams, reason); }

std::string cut(std::string s, std::size_t max) {
    if (s.size() > max) s.resize(max);
    return s;
}

std::string required_string(const nlohmann::json& j, const char* key) {
    const auto it = j.find(key);
    if (it == j.end() || !it->is_string() || it->get_ref<const std::string&>().empty()) {
        invalid(std::string("event needs a string ") + key);
    }
    return cut(it->get<std::string>(), kMaxText);
}

std::string optional_string(const nlohmann::json& j, const char* key, const std::string& fallback) {
    const auto it = j.find(key);
    if (it == j.end() || it->is_null()) return fallback;
    if (!it->is_string()) invalid(std::string("event field must be a string: ") + key);
    return cut(it->get<std::string>(), kMaxText);
}

int64_t optional_nonneg(const nlohmann::json& j, const char* key, int64_t fallback) {
    const auto it = j.find(key);
    if (it == j.end() || it->is_null()) return fallback;
    if (!it->is_number_integer() || it->get<int64_t>() < 0) invalid(std::string("event field must be an integer >= 0: ") + key);
    return it->get<int64_t>();
}

}  // namespace

RuntimeEvent event_from_json(const nlohmann::json& j) {
    if (!j.is_object()) invalid("event must be an object");
    if (!j.contains("v") || !j["v"].is_number_integer() || j["v"].get<int>() != 1) invalid("event v must be 1");
    RuntimeEvent e;
    e.event_id = required_string(j, "event_id");
    e.trace_id = required_string(j, "trace_id");
    e.span_id = required_string(j, "span_id");
    e.kind = required_string(j, "kind");
    if (!kKinds.count(e.kind)) invalid("unknown event kind: " + e.kind);
    if (!j.contains("name") || !j["name"].is_string()) invalid("event needs a string name");
    e.name = cut(j["name"].get<std::string>(), kMaxText);
    if (!j.contains("start_ns")) invalid("event needs start_ns");
    e.start_ns = optional_nonneg(j, "start_ns", 0);
    e.parent_span_id = optional_string(j, "parent_span_id", "");
    e.file_path = optional_string(j, "file_path", "");
    e.status = optional_string(j, "status", "ok");
    if (e.status != "ok" && e.status != "error") invalid("event status must be ok or error");
    e.service = optional_string(j, "service", "");
    e.line = static_cast<int>(optional_nonneg(j, "line", 0));
    e.duration_ns = optional_nonneg(j, "duration_ns", 0);
    if (j.contains("error") && j["error"].is_object()) {
        const nlohmann::json& err = j["error"];
        e.error = EventError{optional_string(err, "type", ""), optional_string(err, "message", ""),
                             err.contains("stack") && err["stack"].is_string() ? cut(err["stack"].get<std::string>(), kMaxStack) : ""};
    }
    if (j.contains("attrs") && j["attrs"].is_object()) e.attrs = j["attrs"];
    return e;
}

nlohmann::json event_to_json(const RuntimeEvent& e) {
    nlohmann::json j{{"v", 1},
                     {"event_id", e.event_id},
                     {"trace_id", e.trace_id},
                     {"span_id", e.span_id},
                     {"parent_span_id", e.parent_span_id.empty() ? nlohmann::json(nullptr) : nlohmann::json(e.parent_span_id)},
                     {"kind", e.kind},
                     {"name", e.name},
                     {"file_path", e.file_path},
                     {"line", e.line},
                     {"start_ns", e.start_ns},
                     {"duration_ns", e.duration_ns},
                     {"status", e.status},
                     {"attrs", e.attrs},
                     {"service", e.service}};
    j["error"] = e.error ? nlohmann::json{{"type", e.error->type}, {"message", e.error->message}, {"stack", e.error->stack}}
                         : nlohmann::json(nullptr);
    return j;
}

bool is_error_event(const RuntimeEvent& e) { return e.status == "error" || e.kind == "error"; }

}  // namespace pv::runtime
