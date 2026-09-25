#pragma once
// Test helpers: synthetic mapped events for routes.get_user_route → services.get_user → utils.is_valid.
#include <string>
#include <vector>

#include "pv/runtime/hub.hpp"

namespace pv::modtrace::testing {

inline const std::string kRoute = "function:app/api/routes.py#get_user_route";
inline const std::string kGetUser = "method:app/services.py#UserService.get_user";
inline const std::string kIsValid = "function:app/utils.py#is_valid";

inline runtime::MappedEvent ev(const std::string& trace, const std::string& span, const std::string& parent_span,
                               const std::string& node, const std::string& parent_node, int64_t start_ns, int64_t duration_ns = 2000000) {
    runtime::MappedEvent m;
    m.ev.event_id = trace + "-" + span;
    m.ev.trace_id = trace;
    m.ev.span_id = span;
    m.ev.parent_span_id = parent_span;
    m.ev.kind = "call";
    m.ev.status = "ok";
    m.ev.start_ns = start_ns;
    m.ev.duration_ns = duration_ns;
    m.node_id = node;
    m.parent_node_id = parent_node;
    return m;
}

inline std::vector<runtime::MappedEvent> request() {
    return {ev("t1", "a", "", kRoute, "", 100), ev("t1", "b", "a", kGetUser, kRoute, 200), ev("t1", "c", "b", kIsValid, kGetUser, 300)};
}

}  // namespace pv::modtrace::testing
