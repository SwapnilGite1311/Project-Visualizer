#include "pv/errmap/store.hpp"

#include <algorithm>

namespace pv::errmap {
namespace {

constexpr std::size_t kMaxRecords = 500;

std::string origin_of(const std::vector<Frame>& frames) {
    for (const Frame& f : frames) {
        if (f.is_origin) return f.node_id;
    }
    return "";
}

}  // namespace

ErrorStore& store() {
    static ErrorStore instance;
    return instance;
}

std::string ErrorStore::next_id() { return "e" + std::to_string(next_++); }

void ErrorStore::add(const std::string& project_id, ErrorRecord record) {
    auto& list = records_[project_id];
    list.push_back(std::move(record));
    if (list.size() > kMaxRecords) list.erase(list.begin());
}

std::string ErrorStore::add_pasted(const std::string& project_id, const ParsedTrace& trace, int64_t now_ms) {
    std::lock_guard lock(mutex_);
    ErrorRecord r;
    r.error_id = next_id();
    r.source = "pasted";
    r.language = trace.language;
    r.error_type = trace.error_type;
    r.message = trace.message;
    r.first_seen_ms = r.last_seen_ms = now_ms;
    r.frames = trace.frames;
    r.origin_node_id = origin_of(r.frames);
    const std::string id = r.error_id;
    add(project_id, std::move(r));
    return id;
}

std::string ErrorStore::add_runtime(const std::string& project_id, const runtime::MappedEvent& event, std::vector<Frame> frames,
                                    int64_t now_ms, const std::string& language) {
    const std::string type = event.ev.error ? event.ev.error->type : "Error";
    const std::string message = event.ev.error ? event.ev.error->message : event.ev.name;
    std::lock_guard lock(mutex_);
    for (ErrorRecord& r : records_[project_id]) {
        if (r.source == "runtime" && r.error_type == type && r.message == message && r.origin_node_id == event.node_id) {
            ++r.count;
            r.last_seen_ms = now_ms;
            if (r.language == "unknown" && language != "unknown" && !frames.empty()) {  // first seen without a readable stack
                r.language = language;
                r.frames = std::move(frames);
            }
            return r.error_id;
        }
    }
    ErrorRecord r;
    r.error_id = next_id();
    r.source = "runtime";
    r.language = frames.empty() ? "unknown" : language;
    r.error_type = type;
    r.message = message;
    r.first_seen_ms = r.last_seen_ms = now_ms;
    if (frames.empty()) {
        frames.push_back({event.ev.file_path, event.ev.line, event.ev.name, event.node_id, !event.node_id.empty(), true});
    }
    r.frames = std::move(frames);
    // The record is keyed by the event's element, even when the stack's origin frame maps elsewhere.
    r.origin_node_id = event.node_id;
    const std::string id = r.error_id;
    add(project_id, std::move(r));
    return id;
}

std::vector<ErrorRecord> ErrorStore::list(const std::string& project_id) const {
    std::lock_guard lock(mutex_);
    const auto it = records_.find(project_id);
    if (it == records_.end()) return {};
    std::vector<ErrorRecord> out(it->second.rbegin(), it->second.rend());
    std::stable_sort(out.begin(), out.end(), [](const ErrorRecord& a, const ErrorRecord& b) { return a.last_seen_ms > b.last_seen_ms; });
    return out;
}

std::optional<ErrorRecord> ErrorStore::get(const std::string& project_id, const std::string& error_id) const {
    std::lock_guard lock(mutex_);
    const auto it = records_.find(project_id);
    if (it == records_.end()) return std::nullopt;
    for (const ErrorRecord& r : it->second) {
        if (r.error_id == error_id) return r;
    }
    return std::nullopt;
}

void ErrorStore::clear(const std::string& project_id, const std::string& error_id) {
    std::lock_guard lock(mutex_);
    if (error_id.empty()) {
        records_.erase(project_id);
        return;
    }
    auto& list = records_[project_id];
    list.erase(std::remove_if(list.begin(), list.end(), [&](const ErrorRecord& r) { return r.error_id == error_id; }), list.end());
}

void ErrorStore::reset_for_tests() {
    std::lock_guard lock(mutex_);
    records_.clear();
    next_ = 1;
}

nlohmann::json frame_to_json(const Frame& f) {
    return {{"file_path", f.file_path}, {"line", f.line}, {"function", f.function},
            {"node_id", f.node_id},     {"in_project", f.in_project}, {"is_origin", f.is_origin}};
}

nlohmann::json record_to_json(const ErrorRecord& r) {
    nlohmann::json frames = nlohmann::json::array();
    for (const Frame& f : r.frames) frames.push_back(frame_to_json(f));
    return {{"error_id", r.error_id},         {"source", r.source},     {"language", r.language},
            {"error_type", r.error_type},     {"message", r.message},   {"count", r.count},
            {"first_seen_ms", r.first_seen_ms}, {"last_seen_ms", r.last_seen_ms}, {"origin_node_id", r.origin_node_id},
            {"frames", frames}};
}

}  // namespace pv::errmap
