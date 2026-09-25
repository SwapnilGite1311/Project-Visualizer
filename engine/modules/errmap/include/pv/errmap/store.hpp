#pragma once
#include <cstdint>
#include <map>
#include <mutex>
#include <optional>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/errmap/errmap.hpp"
#include "pv/runtime/hub.hpp"

namespace pv::errmap {

struct ErrorRecord {
    std::string error_id, source, language, error_type, message;
    int count = 1;
    int64_t first_seen_ms = 0, last_seen_ms = 0;
    std::string origin_node_id;
    std::vector<Frame> frames;
};

// Errors per project, from runtime events and from pasted stack traces (at most 500 per project; oldest dropped).
class ErrorStore {
public:
    std::string add_pasted(const std::string& project_id, const ParsedTrace& trace, int64_t now_ms);
    // Same type, message and element as an existing runtime error → that record's count grows.
    std::string add_runtime(const std::string& project_id, const runtime::MappedEvent& event, std::vector<Frame> frames, int64_t now_ms);
    std::vector<ErrorRecord> list(const std::string& project_id) const;  // most recent first
    std::optional<ErrorRecord> get(const std::string& project_id, const std::string& error_id) const;
    void clear(const std::string& project_id, const std::string& error_id = "");
    void reset_for_tests();

private:
    std::string next_id();
    void add(const std::string& project_id, ErrorRecord record);
    mutable std::mutex mutex_;
    int next_ = 1;
    std::map<std::string, std::vector<ErrorRecord>> records_;
};

ErrorStore& store();
nlohmann::json frame_to_json(const Frame& f);
nlohmann::json record_to_json(const ErrorRecord& r);

}  // namespace pv::errmap
