#pragma once
#include <cstdint>
#include <mutex>
#include <string>
#include <vector>

struct sqlite3;

namespace pv::metrics {

// Runtime statistics of one node in one minute.
struct MinuteRow {
    std::string node_id;
    int64_t minute = 0;  // epoch minutes
    int calls = 0;
    int errors = 0;
    double total_ms = 0;
    double p95_ms = 0;
    int stalls = 0;
};

// Per-project minute history on disk (SQLite). Thread-safe.
class MetricsStore {
public:
    explicit MetricsStore(const std::string& db_path);  // PvError(err::Io) when it cannot be opened
    ~MetricsStore();
    MetricsStore(const MetricsStore&) = delete;
    MetricsStore& operator=(const MetricsStore&) = delete;
    void upsert(const std::vector<MinuteRow>& rows);  // merges into existing minutes
    std::vector<MinuteRow> query(const std::vector<std::string>& node_ids, int64_t from_minute, int64_t to_minute) const;
    std::vector<MinuteRow> all_since(int64_t from_minute) const;

private:
    sqlite3* db_ = nullptr;
    mutable std::mutex mutex_;
};

// PV_DATA_DIR, else %LOCALAPPDATA%\ProjectVisualizer (Windows), ~/Library/Application Support/ProjectVisualizer (macOS),
// ~/.local/share/project-visualizer (Linux).
std::string data_dir();
// <data_dir>/metrics/<16 hex of the normalized root>.db (folders are created).
std::string db_path_for(const std::string& project_root);

}  // namespace pv::metrics
