#pragma once
#include <cstdint>
#include <map>
#include <mutex>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/errmap/store.hpp"
#include "pv/graph/graph.hpp"
#include "pv/runtime/hub.hpp"

namespace pv::fixsync {

// open -> fix_pending (the file with the error changed) -> verified (3 successful calls after the change)
//                                                       -> regressed (the same error happened again)
enum class FixState { Open, FixPending, Verified, Regressed };
std::string to_string(FixState state);  // "open", "fix_pending", "verified", "regressed"

inline constexpr int kCallsToVerify = 3;

struct FixItem {
    std::string error_id, node_id, file_path, key;  // key = type|message|node
    FixState state = FixState::Open;
    int64_t changed_at_ms = 0;
    int ok_calls = 0;
};

class FixTracker {
public:
    // Errors whose origin element is in one of the changed files become (or become again) fix_pending. Returns the changed items.
    std::vector<FixItem> on_files_changed(const std::string& pid, const std::vector<errmap::ErrorRecord>& open_errors,
                                          const std::vector<std::string>& files, const graph::Graph& g, int64_t now_ms);
    // Successful calls on a pending element count towards verified; the same error again means regressed. Returns the changed items.
    std::vector<FixItem> on_runtime(const std::string& pid, const std::vector<runtime::MappedEvent>& batch, int64_t now_ms);
    std::vector<FixItem> list(const std::string& pid) const;  // sorted by error id
    void reset_for_tests();

private:
    mutable std::mutex mutex_;
    std::map<std::string, std::map<std::string, FixItem>> items_;  // project -> error id -> item
};

FixTracker& tracker();
nlohmann::json to_json(const FixItem& item);
std::string error_key(const std::string& type, const std::string& message, const std::string& node_id);

}  // namespace pv::fixsync
