#pragma once
#include <atomic>
#include <cstdint>
#include <memory>
#include <mutex>
#include <optional>
#include <string>

#include <nlohmann/json.hpp>

#include "pv/parse/raw.hpp"

struct sqlite3;
namespace leveldb {
class DB;
}

namespace pv::cache {

struct Stats {
    std::string dir;
    int64_t files = 0;   // extractions indexed in SQLite
    int64_t hits = 0;    // since the engine started
    int64_t misses = 0;
    int64_t bytes = 0;   // size of the cache folder on disk
};

// The local cache of one project (new architecture "local cache"): SQLite `meta.db` for project metadata and the
// extraction index, LevelDB `blobs/` for extraction and layout blobs. Thread-safe.
class ProjectCache {
public:
    // Opens (or creates) the cache folder of a project root. A different engine build or schema wipes it first.
    // nullptr when the folder cannot be used.
    static std::unique_ptr<ProjectCache> open(const std::string& root);
    ~ProjectCache();

    std::optional<parse::FileExtraction> get_extraction(const std::string& language, const std::string& content_hash);
    void put_extraction(const std::string& rel_path, const std::string& language, const std::string& content_hash,
                        const parse::FileExtraction& fx);
    std::optional<nlohmann::json> get_layout(const std::string& key);
    void put_layout(const std::string& key, const nlohmann::json& value);
    Stats stats() const;
    void clear();  // deletes everything and starts empty
    const std::string& dir() const { return dir_; }

private:
    ProjectCache(std::string root, std::string dir);
    bool open_stores();
    void close_stores();

    std::string root_;
    std::string dir_;
    mutable std::mutex mutex_;
    sqlite3* db_ = nullptr;
    leveldb::DB* blobs_ = nullptr;
    std::atomic<int64_t> hits_{0};
    std::atomic<int64_t> misses_{0};
};

// The process-wide cache of a project root, opened on first use (nullptr when it cannot be opened). Used by the
// extraction hook and by other modules (layouts).
ProjectCache* shared_cache(const std::string& root);

std::string cache_root();                        // $PV_CACHE_DIR, else $PV_HOME or ~/.project-visualizer + "/cache"
std::string cache_dir_for(const std::string& root);  // <cache_root>/<16 hex of the normalized root>
std::string build_fingerprint();                 // engine version + size and time of the running executable

nlohmann::json extraction_to_json(const parse::FileExtraction& fx);
parse::FileExtraction extraction_from_json(const nlohmann::json& j);

}  // namespace pv::cache
