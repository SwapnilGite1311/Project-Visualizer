#include <algorithm>
#include <set>

#include "pv/fixsync/fixsync.hpp"

namespace pv::fixsync {

std::string to_string(FixState state) {
    switch (state) {
        case FixState::Open: return "open";
        case FixState::FixPending: return "fix_pending";
        case FixState::Verified: return "verified";
        case FixState::Regressed: return "regressed";
    }
    return "open";
}

std::string error_key(const std::string& type, const std::string& message, const std::string& node_id) {
    return type + "|" + message + "|" + node_id;
}

FixTracker& tracker() {
    static FixTracker instance;
    return instance;
}

nlohmann::json to_json(const FixItem& item) {
    return {{"error_id", item.error_id},     {"node_id", item.node_id},           {"file_path", item.file_path},
            {"state", to_string(item.state)}, {"changed_at_ms", item.changed_at_ms}, {"ok_calls", item.ok_calls}};
}

std::vector<FixItem> FixTracker::on_files_changed(const std::string& pid, const std::vector<errmap::ErrorRecord>& open_errors,
                                                  const std::vector<std::string>& files, const graph::Graph& g, int64_t now_ms) {
    const std::set<std::string> changed(files.begin(), files.end());
    std::vector<FixItem> out;
    std::lock_guard lock(mutex_);
    auto& items = items_[pid];
    for (const errmap::ErrorRecord& r : open_errors) {
        if (r.origin_node_id.empty()) continue;
        const core::Node* node = g.find_node(r.origin_node_id);
        if (!node || !changed.count(node->file_path)) continue;
        FixItem& item = items[r.error_id];
        item.error_id = r.error_id;
        item.node_id = r.origin_node_id;
        item.file_path = node->file_path;
        item.key = error_key(r.error_type, r.message, r.origin_node_id);
        item.state = FixState::FixPending;
        item.changed_at_ms = now_ms;
        item.ok_calls = 0;
        out.push_back(item);
    }
    return out;
}

std::vector<FixItem> FixTracker::on_runtime(const std::string& pid, const std::vector<runtime::MappedEvent>& batch, int64_t) {
    std::vector<FixItem> out;
    std::lock_guard lock(mutex_);
    const auto project = items_.find(pid);
    if (project == items_.end()) return out;
    for (auto& [id, item] : project->second) {
        if (item.state != FixState::FixPending) continue;
        bool changed = false;
        for (const runtime::MappedEvent& m : batch) {
            if (m.node_id != item.node_id) continue;
            if (m.ev.start_ns / 1000000 < item.changed_at_ms) continue;  // ran before the fix was saved
            if (runtime::is_error_event(m.ev)) {
                const std::string type = m.ev.error ? m.ev.error->type : "Error";
                const std::string message = m.ev.error ? m.ev.error->message : m.ev.name;
                if (error_key(type, message, m.node_id) == item.key) {
                    item.state = FixState::Regressed;
                    changed = true;
                    break;
                }
                continue;  // a different error: says nothing about this fix
            }
            if (++item.ok_calls >= kCallsToVerify) {
                item.state = FixState::Verified;
                changed = true;
                break;
            }
            changed = true;
        }
        if (changed) out.push_back(item);
    }
    return out;
}

std::vector<FixItem> FixTracker::list(const std::string& pid) const {
    std::lock_guard lock(mutex_);
    std::vector<FixItem> out;
    const auto it = items_.find(pid);
    if (it == items_.end()) return out;
    for (const auto& [id, item] : it->second) out.push_back(item);
    return out;
}

void FixTracker::reset_for_tests() {
    std::lock_guard lock(mutex_);
    items_.clear();
}

}  // namespace pv::fixsync
