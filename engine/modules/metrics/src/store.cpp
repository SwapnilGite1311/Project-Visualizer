#include "pv/metrics/store.hpp"

#include <sqlite3.h>

#include <cctype>
#include <cstdlib>
#include <filesystem>

#include "pv/builder/extraction_cache.hpp"
#include "pv/core/error.hpp"
#include "pv/core/paths.hpp"

namespace pv::metrics {

namespace {

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

std::filesystem::path to_fs(const std::string& utf8) {
    return std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(utf8.data()), utf8.size()));
}

[[noreturn]] void fail(sqlite3* db) {
    throw core::PvError(core::err::Io, std::string("metrics: ") + (db ? sqlite3_errmsg(db) : "sqlite error"));
}

// Finalizes a statement when it goes out of scope.
struct Stmt {
    sqlite3_stmt* s = nullptr;
    ~Stmt() { sqlite3_finalize(s); }
};

MinuteRow row_of(sqlite3_stmt* s) {
    MinuteRow r;
    r.node_id = reinterpret_cast<const char*>(sqlite3_column_text(s, 0));
    r.minute = sqlite3_column_int64(s, 1);
    r.calls = sqlite3_column_int(s, 2);
    r.errors = sqlite3_column_int(s, 3);
    r.total_ms = sqlite3_column_double(s, 4);
    r.p95_ms = sqlite3_column_double(s, 5);
    r.stalls = sqlite3_column_int(s, 6);
    return r;
}

constexpr const char* kColumns = "node_id, minute, calls, errors, total_ms, p95_ms, stalls";

}  // namespace

MetricsStore::MetricsStore(const std::string& db_path) {
    if (sqlite3_open_v2(db_path.c_str(), &db_, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, nullptr) !=
        SQLITE_OK) {
        const std::string msg = db_ ? sqlite3_errmsg(db_) : "cannot open";
        sqlite3_close_v2(db_);
        db_ = nullptr;
        throw core::PvError(core::err::Io, "metrics: " + msg);
    }
    const char* schema =
        "PRAGMA journal_mode=WAL;"
        "CREATE TABLE IF NOT EXISTS node_minute (node_id TEXT NOT NULL, minute INTEGER NOT NULL, calls INTEGER NOT NULL,"
        " errors INTEGER NOT NULL, total_ms REAL NOT NULL, p95_ms REAL NOT NULL, stalls INTEGER NOT NULL,"
        " PRIMARY KEY (node_id, minute));";
    if (sqlite3_exec(db_, schema, nullptr, nullptr, nullptr) != SQLITE_OK) fail(db_);
}

MetricsStore::~MetricsStore() {
    if (db_) sqlite3_close_v2(db_);
}

void MetricsStore::upsert(const std::vector<MinuteRow>& rows) {
    if (rows.empty()) return;
    std::lock_guard<std::mutex> lock(mutex_);
    if (sqlite3_exec(db_, "BEGIN", nullptr, nullptr, nullptr) != SQLITE_OK) fail(db_);
    Stmt st;
    const char* sql =
        "INSERT INTO node_minute (node_id, minute, calls, errors, total_ms, p95_ms, stalls) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
        " ON CONFLICT(node_id, minute) DO UPDATE SET calls = calls + excluded.calls, errors = errors + excluded.errors,"
        " total_ms = total_ms + excluded.total_ms, p95_ms = MAX(p95_ms, excluded.p95_ms), stalls = stalls + excluded.stalls";
    if (sqlite3_prepare_v2(db_, sql, -1, &st.s, nullptr) != SQLITE_OK) {
        sqlite3_exec(db_, "ROLLBACK", nullptr, nullptr, nullptr);
        fail(db_);
    }
    for (const MinuteRow& r : rows) {
        sqlite3_reset(st.s);
        sqlite3_bind_text(st.s, 1, r.node_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int64(st.s, 2, r.minute);
        sqlite3_bind_int(st.s, 3, r.calls);
        sqlite3_bind_int(st.s, 4, r.errors);
        sqlite3_bind_double(st.s, 5, r.total_ms);
        sqlite3_bind_double(st.s, 6, r.p95_ms);
        sqlite3_bind_int(st.s, 7, r.stalls);
        if (sqlite3_step(st.s) != SQLITE_DONE) {
            sqlite3_exec(db_, "ROLLBACK", nullptr, nullptr, nullptr);
            fail(db_);
        }
    }
    if (sqlite3_exec(db_, "COMMIT", nullptr, nullptr, nullptr) != SQLITE_OK) fail(db_);
}

std::vector<MinuteRow> MetricsStore::query(const std::vector<std::string>& node_ids, int64_t from_minute, int64_t to_minute) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<MinuteRow> out;
    Stmt st;
    const std::string sql = std::string("SELECT ") + kColumns +
                            " FROM node_minute WHERE node_id = ?1 AND minute >= ?2 AND minute <= ?3 ORDER BY minute";
    if (sqlite3_prepare_v2(db_, sql.c_str(), -1, &st.s, nullptr) != SQLITE_OK) fail(db_);
    for (const std::string& id : node_ids) {
        sqlite3_reset(st.s);
        sqlite3_bind_text(st.s, 1, id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int64(st.s, 2, from_minute);
        sqlite3_bind_int64(st.s, 3, to_minute);
        while (sqlite3_step(st.s) == SQLITE_ROW) out.push_back(row_of(st.s));
    }
    return out;
}

std::vector<MinuteRow> MetricsStore::all_since(int64_t from_minute) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<MinuteRow> out;
    Stmt st;
    const std::string sql = std::string("SELECT ") + kColumns + " FROM node_minute WHERE minute >= ?1 ORDER BY node_id, minute";
    if (sqlite3_prepare_v2(db_, sql.c_str(), -1, &st.s, nullptr) != SQLITE_OK) fail(db_);
    sqlite3_bind_int64(st.s, 1, from_minute);
    while (sqlite3_step(st.s) == SQLITE_ROW) out.push_back(row_of(st.s));
    return out;
}

std::string data_dir() {
    const std::string override_dir = env("PV_DATA_DIR");
    if (!override_dir.empty()) return core::normalize_path(override_dir);
#ifdef _WIN32
    const std::string local = env("LOCALAPPDATA");
    if (!local.empty()) return core::normalize_path(local + "/ProjectVisualizer");
#elif defined(__APPLE__)
    const std::string home = env("HOME");
    if (!home.empty()) return home + "/Library/Application Support/ProjectVisualizer";
#else
    const std::string home = env("HOME");
    if (!home.empty()) return home + "/.local/share/project-visualizer";
#endif
    return core::normalize_path(std::filesystem::temp_directory_path().generic_string() + "/ProjectVisualizer");
}

std::string db_path_for(const std::string& project_root) {
    std::string key = core::normalize_path(project_root);
#ifdef _WIN32
    for (char& c : key) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
#endif
    const std::string dir = data_dir() + "/metrics";
    std::error_code ec;
    std::filesystem::create_directories(to_fs(dir), ec);
    return dir + "/" + builder::content_hash(key) + ".db";
}

}  // namespace pv::metrics
