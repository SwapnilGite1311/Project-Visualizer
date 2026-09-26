#include "pv/cache/project_cache.hpp"

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#elif defined(__APPLE__)
#include <mach-o/dyld.h>
#endif

#include <sqlite3.h>

#include <leveldb/db.h>
#include <leveldb/options.h>

#include <cctype>
#include <cstdlib>
#include <filesystem>
#include <map>

#include "pv/builder/extraction_cache.hpp"
#include "pv/core/log.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/version.hpp"

namespace pv::cache {

namespace {

constexpr const char* kSchemaVersion = "1";

std::filesystem::path to_fs(const std::string& utf8) {
    return std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(utf8.data()), utf8.size()));
}

std::string from_fs(const std::filesystem::path& p) {
    const std::u8string s = p.generic_u8string();
    return std::string(reinterpret_cast<const char*>(s.data()), s.size());
}

std::string env(const char* name) {
#ifdef _WIN32
    char* value = nullptr;
    std::size_t len = 0;
    if (_dupenv_s(&value, &len, name) != 0 || !value) return "";
    std::string out(value);
    std::free(value);
    return out;
#else
    const char* v = std::getenv(name);
    return v ? v : "";
#endif
}

std::filesystem::path executable_path() {
#ifdef _WIN32
    wchar_t buf[32768];
    const DWORD n = GetModuleFileNameW(nullptr, buf, 32768);
    return n > 0 ? std::filesystem::path(std::wstring(buf, n)) : std::filesystem::path();
#elif defined(__APPLE__)
    char buf[4096];
    uint32_t size = sizeof(buf);
    return _NSGetExecutablePath(buf, &size) == 0 ? std::filesystem::path(buf) : std::filesystem::path();
#else
    std::error_code ec;
    return std::filesystem::read_symlink("/proc/self/exe", ec);
#endif
}

bool exec(sqlite3* db, const char* sql) {
    char* err = nullptr;
    if (sqlite3_exec(db, sql, nullptr, nullptr, &err) != SQLITE_OK) {
        core::log_warn(std::string("cache: sqlite: ") + (err ? err : "error"));
        sqlite3_free(err);
        return false;
    }
    return true;
}

std::string meta_get(sqlite3* db, const std::string& key) {
    sqlite3_stmt* st = nullptr;
    std::string value;
    if (sqlite3_prepare_v2(db, "SELECT value FROM project WHERE key = ?1", -1, &st, nullptr) == SQLITE_OK) {
        sqlite3_bind_text(st, 1, key.c_str(), -1, SQLITE_TRANSIENT);
        if (sqlite3_step(st) == SQLITE_ROW) value = reinterpret_cast<const char*>(sqlite3_column_text(st, 0));
    }
    sqlite3_finalize(st);
    return value;
}

void meta_set(sqlite3* db, const std::string& key, const std::string& value) {
    sqlite3_stmt* st = nullptr;
    if (sqlite3_prepare_v2(db, "INSERT OR REPLACE INTO project(key, value) VALUES(?1, ?2)", -1, &st, nullptr) == SQLITE_OK) {
        sqlite3_bind_text(st, 1, key.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(st, 2, value.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_step(st);
    }
    sqlite3_finalize(st);
}

}  // namespace

ProjectCache* shared_cache(const std::string& root) {
    static std::mutex mutex;
    static std::map<std::string, std::unique_ptr<ProjectCache>> caches;
    std::string key = core::normalize_path(root);
#ifdef _WIN32
    for (char& c : key) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
#endif
    key = cache_root() + "|" + key;  // tests change PV_CACHE_DIR between cases
    std::lock_guard<std::mutex> lock(mutex);
    auto& slot = caches[key];
    if (!slot) slot = ProjectCache::open(root);
    return slot.get();
}

std::string cache_root() {
    const std::string dir = env("PV_CACHE_DIR");
    if (!dir.empty()) return core::normalize_path(dir);
    std::string home = env("PV_HOME");
    if (home.empty()) {
#ifdef _WIN32
        home = env("USERPROFILE");
#else
        home = env("HOME");
#endif
        home = home.empty() ? from_fs(std::filesystem::temp_directory_path()) : home + "/.project-visualizer";
    }
    return core::normalize_path(home + "/cache");
}

std::string cache_dir_for(const std::string& root) {
    std::string key = core::normalize_path(root);
#ifdef _WIN32
    for (char& c : key) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));  // C:/A and c:/a are one folder
#endif
    return cache_root() + "/" + builder::content_hash(key);
}

std::string build_fingerprint() {
    std::string out = core::kEngineVersion;
    std::error_code ec;
    const auto exe = executable_path();
    if (!exe.empty()) {
        const auto size = std::filesystem::file_size(exe, ec);
        const auto time = std::filesystem::last_write_time(exe, ec);
        if (!ec) out += "-" + std::to_string(size) + "-" + std::to_string(time.time_since_epoch().count());
    }
    return out;
}

ProjectCache::ProjectCache(std::string root, std::string dir) : root_(std::move(root)), dir_(std::move(dir)) {}

ProjectCache::~ProjectCache() {
    close_stores();
}

std::unique_ptr<ProjectCache> ProjectCache::open(const std::string& root) {
    std::unique_ptr<ProjectCache> cache(new ProjectCache(core::normalize_path(root), cache_dir_for(root)));
    if (!cache->open_stores()) return nullptr;
    return cache;
}

bool ProjectCache::open_stores() {
    std::error_code ec;
    std::filesystem::create_directories(to_fs(dir_), ec);
    if (sqlite3_open_v2((dir_ + "/meta.db").c_str(), &db_, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX,
                        nullptr) != SQLITE_OK) {
        close_stores();
        return false;
    }
    exec(db_, "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;");
    exec(db_, "CREATE TABLE IF NOT EXISTS project(key TEXT PRIMARY KEY, value TEXT NOT NULL);"
              "CREATE TABLE IF NOT EXISTS files(rel_path TEXT PRIMARY KEY, language TEXT NOT NULL, content_hash TEXT NOT NULL,"
              " stored_ms INTEGER NOT NULL);");
    const std::string fingerprint = build_fingerprint();
    const bool stale = meta_get(db_, "schema") != kSchemaVersion || meta_get(db_, "build") != fingerprint;
    if (stale && !meta_get(db_, "schema").empty()) {
        // Another engine build may extract differently: start over.
        close_stores();
        std::filesystem::remove_all(to_fs(dir_), ec);
        std::filesystem::create_directories(to_fs(dir_), ec);
        if (sqlite3_open_v2((dir_ + "/meta.db").c_str(), &db_, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX,
                            nullptr) != SQLITE_OK) {
            close_stores();
            return false;
        }
        exec(db_, "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;");
        exec(db_, "CREATE TABLE IF NOT EXISTS project(key TEXT PRIMARY KEY, value TEXT NOT NULL);"
                  "CREATE TABLE IF NOT EXISTS files(rel_path TEXT PRIMARY KEY, language TEXT NOT NULL, content_hash TEXT NOT NULL,"
                  " stored_ms INTEGER NOT NULL);");
    }
    meta_set(db_, "schema", kSchemaVersion);
    meta_set(db_, "build", fingerprint);
    meta_set(db_, "root", root_);

    leveldb::Options options;
    options.create_if_missing = true;
    options.write_buffer_size = 4 << 20;
    const leveldb::Status status = leveldb::DB::Open(options, dir_ + "/blobs", &blobs_);
    if (!status.ok()) {
        core::log_warn("cache: leveldb: " + status.ToString());
        close_stores();
        return false;
    }
    return true;
}

void ProjectCache::close_stores() {
    delete blobs_;
    blobs_ = nullptr;
    if (db_) sqlite3_close_v2(db_);
    db_ = nullptr;
}

std::optional<parse::FileExtraction> ProjectCache::get_extraction(const std::string& language, const std::string& content_hash) {
    std::string value;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!blobs_ || !blobs_->Get(leveldb::ReadOptions(), "x:" + language + ":" + content_hash, &value).ok()) {
            ++misses_;
            return std::nullopt;
        }
    }
    try {
        auto fx = extraction_from_json(nlohmann::json::parse(value));
        ++hits_;
        return fx;
    } catch (const std::exception&) {
        ++misses_;
        return std::nullopt;  // an unreadable entry is simply parsed again
    }
}

void ProjectCache::put_extraction(const std::string& rel_path, const std::string& language, const std::string& content_hash,
                                  const parse::FileExtraction& fx) {
    const std::string blob = extraction_to_json(fx).dump();
    std::lock_guard<std::mutex> lock(mutex_);
    if (!blobs_ || !db_) return;
    blobs_->Put(leveldb::WriteOptions(), "x:" + language + ":" + content_hash, blob);
    sqlite3_stmt* st = nullptr;
    if (sqlite3_prepare_v2(db_,
                           "INSERT OR REPLACE INTO files(rel_path, language, content_hash, stored_ms)"
                           " VALUES(?1, ?2, ?3, CAST(strftime('%s','now') AS INTEGER) * 1000)",
                           -1, &st, nullptr) == SQLITE_OK) {
        sqlite3_bind_text(st, 1, rel_path.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(st, 2, language.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(st, 3, content_hash.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_step(st);
    }
    sqlite3_finalize(st);
}

std::optional<nlohmann::json> ProjectCache::get_layout(const std::string& key) {
    std::string value;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!blobs_ || !blobs_->Get(leveldb::ReadOptions(), "l:" + key, &value).ok()) return std::nullopt;
    }
    try {
        return nlohmann::json::parse(value);
    } catch (const std::exception&) {
        return std::nullopt;
    }
}

void ProjectCache::put_layout(const std::string& key, const nlohmann::json& value) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (blobs_) blobs_->Put(leveldb::WriteOptions(), "l:" + key, value.dump());
}

Stats ProjectCache::stats() const {
    Stats s;
    s.dir = dir_;
    s.hits = hits_;
    s.misses = misses_;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        sqlite3_stmt* st = nullptr;
        if (db_ && sqlite3_prepare_v2(db_, "SELECT COUNT(*) FROM files", -1, &st, nullptr) == SQLITE_OK &&
            sqlite3_step(st) == SQLITE_ROW) {
            s.files = sqlite3_column_int64(st, 0);
        }
        sqlite3_finalize(st);
    }
    std::error_code ec;
    for (auto it = std::filesystem::recursive_directory_iterator(to_fs(dir_), ec);
         it != std::filesystem::recursive_directory_iterator(); it.increment(ec)) {
        if (ec) break;
        if (it->is_regular_file(ec)) s.bytes += static_cast<int64_t>(it->file_size(ec));
    }
    return s;
}

void ProjectCache::clear() {
    std::lock_guard<std::mutex> lock(mutex_);
    close_stores();
    std::error_code ec;
    std::filesystem::remove_all(to_fs(dir_), ec);
    hits_ = 0;
    misses_ = 0;
    open_stores();
}

}  // namespace pv::cache
