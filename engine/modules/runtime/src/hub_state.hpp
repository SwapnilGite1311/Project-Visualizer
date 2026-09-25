#pragma once
// Internal: per-project runtime state, shared by hub.cpp and traces.cpp. Guarded by RuntimeHub::mutex_.
#include <deque>
#include <map>
#include <set>
#include <unordered_map>

#include "pv/runtime/hub.hpp"

namespace pv::runtime {

inline constexpr std::size_t kBufferMax = 50000;
inline constexpr std::size_t kSpanMapMax = 200000;
inline constexpr int64_t kWindowMs = 250;

struct RuntimeHub::ProjectState {
    std::deque<MappedEvent> buffer;
    int64_t events_total = 0;
    int64_t last_event_ms = 0;
    std::set<std::string> services;
    std::unordered_map<std::string, std::string> span_nodes;  // span id -> node id

    // Current 250 ms window.
    int64_t window_start_ms = 0;
    int64_t window_start_ns = 0;
    int64_t window_end_ns = 0;
    std::map<std::string, int> node_hits;
    std::map<std::string, int> edge_flows;
    nlohmann::json errors = nlohmann::json::array();
    nlohmann::json stalls = nlohmann::json::array();

    void reset_window() {
        window_start_ms = window_start_ns = window_end_ns = 0;
        node_hits.clear();
        edge_flows.clear();
        errors = nlohmann::json::array();
        stalls = nlohmann::json::array();
    }
};

}  // namespace pv::runtime
