#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <filesystem>
#include <thread>

#include "pv/builder/builder.hpp"
#include "pv/core/log.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/error.hpp"
#include "pv/core/text.hpp"
#include "pv/fswatch/fswatch.hpp"
#include "pv/incremental/incremental.hpp"

namespace pv::incremental {

struct IncrementalManager::Watch {
    std::mutex mutex;  // guards the cache, the states and apply_changes
    ExtractionMap cache;
    StateMap states;
    std::atomic<bool> seeded{false};
    std::atomic<bool> stop{false};
    std::atomic<bool> watching{false};
    std::atomic<int> interval_ms{1000};
    std::atomic<int64_t> last_change_ms{0};
    std::thread worker;
    // Native mode: the OS watcher queues batches; the worker thread applies them.
    std::unique_ptr<fswatch::Watcher> native;
    std::atomic<bool> native_mode{false};
    WatchMode requested = WatchMode::Auto;
    std::mutex queue_mutex;
    std::condition_variable queue_cv;
    std::vector<fswatch::Change> queue;
};

namespace {

int64_t wall_ms() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
}

parse::FileExtraction extract_file(const session::Project& project, const parse::AdapterRegistry& adapters, const std::string& rel) {
    parse::FileExtraction fx;
    fx.file_path = rel;
    const parse::LanguageAdapter* adapter = adapters.for_extension(core::path_extension(rel));
    if (!adapter) return fx;
    fx.language = adapter->id();
    try {
        return adapter->extract(rel, core::read_file_text(core::path_join(project.root_path(), rel)));
    } catch (const std::exception& e) {
        core::log_warn("incremental: cannot parse " + rel + ": " + e.what());
        return fx;  // keep the file (as an empty module) until it parses again
    }
}

constexpr int kSafetyScanMs = 10000;  // native mode still compares everything this often

std::filesystem::path to_fs_path(const std::string& utf8) {
    return std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(utf8.data()), utf8.size()));
}

// Turns native events into a change set for files we already know. Returns false when a full compare is needed
// (new files may be ignored by .gitignore, folders may have moved, events may have been lost).
bool targeted_changes(const std::vector<fswatch::Change>& batch, const std::string& root, const parse::AdapterRegistry& adapters,
                      StateMap& states, ChangeSet& out) {
    for (const fswatch::Change& c : batch) {
        if (c.kind == fswatch::Change::Kind::Rescan) return false;
        const auto known = states.find(c.rel_path);
        if (known == states.end()) {
            // Unknown path: a new file, a folder, or a file type we do not parse.
            if (!adapters.for_extension(core::path_extension(c.rel_path))) {
                if (c.kind == fswatch::Change::Kind::Deleted && core::path_extension(c.rel_path).empty()) return false;
                continue;
            }
            return false;
        }
        std::error_code ec;
        const std::filesystem::path path = to_fs_path(core::path_join(root, c.rel_path));
        if (!std::filesystem::is_regular_file(path, ec)) {
            out.removed.push_back(c.rel_path);
            states.erase(known);
            continue;
        }
        FileState state;
        state.size = std::filesystem::file_size(path, ec);
        const auto time = std::filesystem::last_write_time(path, ec);
        if (!ec) state.mtime_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(time.time_since_epoch()).count();
        if (state.mtime_ns == known->second.mtime_ns && state.size == known->second.size) continue;  // nothing new
        known->second = state;
        out.modified.push_back(c.rel_path);
    }
    std::sort(out.modified.begin(), out.modified.end());
    std::sort(out.removed.begin(), out.removed.end());
    return true;
}

}  // namespace

WatchMode parse_watch_mode(const std::string& text) {
    if (text == "auto") return WatchMode::Auto;
    if (text == "native") return WatchMode::Native;
    if (text == "poll") return WatchMode::Poll;
    throw core::PvError(core::err::InvalidParams, "mode must be auto, native or poll");
}

IncrementalManager& manager() {
    static IncrementalManager instance;
    return instance;
}

IncrementalManager::~IncrementalManager() { stop_all(); }

std::shared_ptr<IncrementalManager::Watch> IncrementalManager::watch_for(const std::string& project_id) {
    std::lock_guard lock(mutex_);
    auto& w = watches_[project_id];
    if (!w) w = std::make_shared<Watch>();
    return w;
}

std::shared_ptr<IncrementalManager::Watch> IncrementalManager::find_watch(const std::string& project_id) const {
    std::lock_guard lock(mutex_);
    const auto it = watches_.find(project_id);
    return it == watches_.end() ? nullptr : it->second;
}

void IncrementalManager::seed(session::Project& project, const parse::AdapterRegistry& adapters) {
    const auto w = watch_for(project.id());
    std::lock_guard lock(w->mutex);
    fs::DiscoverOptions options;
    options.extensions = adapters.all_extensions();
    const fs::DiscoverResult found = fs::discover_files(project.root_path(), options);
    std::vector<std::string> errors;
    w->cache.clear();
    for (parse::FileExtraction& fx : builder::extract_all(adapters, found.files, nullptr, 0, errors)) {
        if (!fx.file_path.empty()) w->cache[fx.file_path] = std::move(fx);
    }
    w->states = scan_states(project.root_path(), adapters, {});
    w->seeded = true;
}

std::vector<std::string> IncrementalManager::apply_changes(session::Project& project, const parse::AdapterRegistry& adapters,
                                                           rpc::Notifier& notifier, const ChangeSet& changes) {
    const auto w = watch_for(project.id());
    if (!w->seeded) seed(project, adapters);
    std::vector<std::string> files;
    GraphDiff diff;
    {
        std::lock_guard lock(w->mutex);
        for (const std::string& rel : changes.added) w->cache[rel] = extract_file(project, adapters, rel);
        for (const std::string& rel : changes.modified) w->cache[rel] = extract_file(project, adapters, rel);
        for (const std::string& rel : changes.removed) w->cache.erase(rel);
        graph::Graph after = rebuild_graph(adapters, project.root_path(), w->cache);
        const graph::Graph before = project.read([](const graph::Graph& g) { return g; });
        for (const core::Node* n : before.all_nodes()) {  // runtime health survives edits
            if (core::Node* kept = after.find_node_mut(n->id)) kept->health = n->health;
        }
        diff = diff_graphs(before, after);
        project.replace_graph(std::move(after));

        std::vector<std::string> main_guard, syntax_errors;
        for (const auto& [rel, fx] : w->cache) {
            if (fx.has_main_guard) main_guard.push_back(rel);
            if (fx.has_syntax_errors) syntax_errors.push_back(rel);
        }
        project.set_build_info(main_guard, syntax_errors, project.parse_errors());
        files = changes.added;
        files.insert(files.end(), changes.modified.begin(), changes.modified.end());
        files.insert(files.end(), changes.removed.begin(), changes.removed.end());
        std::sort(files.begin(), files.end());
        w->last_change_ms = wall_ms();
    }
    notifier.notify("graph.changed", nlohmann::json{{"project_id", project.id()},
                                                    {"files_changed", files},
                                                    {"nodes_added", diff.added},
                                                    {"nodes_removed", diff.removed},
                                                    {"nodes_updated", diff.updated}});
    std::vector<ChangeListener> listeners;
    {
        std::lock_guard lock(mutex_);
        listeners = listeners_;
    }
    for (const ChangeListener& l : listeners) l(project.id(), files, diff);
    return files;
}

void IncrementalManager::start(std::shared_ptr<session::Project> project, const parse::AdapterRegistry& adapters,
                               rpc::Notifier& notifier, int interval_ms, WatchMode mode) {
    auto w = watch_for(project->id());
    w->interval_ms = interval_ms;
    if (w->watching) {
        if (w->requested == mode) return;  // already watching: only the interval changes
        stop(project->id());
    }
    if (w->worker.joinable()) w->worker.join();
    w->stop = false;
    w->requested = mode;
    w->native.reset();
    {
        std::lock_guard lock(w->queue_mutex);
        w->queue.clear();
    }
    if (mode != WatchMode::Poll) {
        Watch* raw = w.get();  // the watcher is stopped before the Watch goes away (stop())
        w->native = fswatch::create_watcher(project->root_path(), {}, [raw](std::vector<fswatch::Change> batch) {
            {
                std::lock_guard lock(raw->queue_mutex);
                raw->queue.insert(raw->queue.end(), batch.begin(), batch.end());
            }
            raw->queue_cv.notify_all();
        });
        if (!w->native && mode == WatchMode::Native) {
            throw core::PvError(core::err::Unsupported, "native file watching is not available for this folder");
        }
    }
    w->native_mode = w->native != nullptr;
    w->watching = true;
    w->worker = std::thread([this, w, project, &adapters, &notifier] {
        try {
            if (!w->seeded) seed(*project, adapters);
            auto full_compare = [&] {
                const StateMap after = scan_states(project->root_path(), adapters, {});
                ChangeSet changes;
                {
                    std::lock_guard lock(w->mutex);
                    changes = diff_states(w->states, after);
                    if (!changes.empty()) w->states = after;
                }
                if (!changes.empty()) apply_changes(*project, adapters, notifier, changes);
            };
            while (!w->stop) {
                if (w->native_mode) {
                    std::vector<fswatch::Change> batch;
                    {
                        std::unique_lock lock(w->queue_mutex);
                        w->queue_cv.wait_for(lock, std::chrono::milliseconds(kSafetyScanMs),
                                             [&] { return w->stop.load() || !w->queue.empty(); });
                        batch.swap(w->queue);
                    }
                    if (w->stop) break;
                    if (project.use_count() == 1) break;  // the project was closed
                    if (batch.empty()) {
                        full_compare();  // safety net
                        continue;
                    }
                    ChangeSet changes;
                    bool targeted = false;
                    {
                        std::lock_guard lock(w->mutex);
                        targeted = targeted_changes(batch, project->root_path(), adapters, w->states, changes);
                    }
                    if (!targeted) full_compare();
                    else if (!changes.empty()) apply_changes(*project, adapters, notifier, changes);
                    continue;
                }
                for (int waited = 0; waited < w->interval_ms && !w->stop; waited += 50) {
                    std::this_thread::sleep_for(std::chrono::milliseconds(50));
                }
                if (w->stop) break;
                if (project.use_count() == 1) break;  // the project was closed: this thread holds the last reference
                full_compare();
            }
        } catch (const std::exception& e) {
            core::log_error(std::string("incremental: watching stopped: ") + e.what());
        }
        w->watching = false;
    });
}

void IncrementalManager::stop(const std::string& project_id) {
    const auto w = find_watch(project_id);
    if (!w) return;
    w->stop = true;
    if (w->native) w->native->stop();  // no more queued batches
    w->queue_cv.notify_all();
    if (w->worker.joinable() && w->worker.get_id() != std::this_thread::get_id()) w->worker.join();
    w->native.reset();
    w->native_mode = false;
    w->watching = false;
}

nlohmann::json IncrementalManager::status(const std::string& project_id) const {
    const auto w = find_watch(project_id);
    if (!w) return {{"watching", false}, {"interval_ms", 1000}, {"seeded", false}, {"last_change_ms", 0}, {"mode", "poll"}};
    return {{"watching", w->watching.load()},
            {"interval_ms", w->interval_ms.load()},
            {"seeded", w->seeded.load()},
            {"last_change_ms", w->last_change_ms.load()},
            {"mode", w->native_mode.load() ? "native" : "poll"}};
}

void IncrementalManager::add_listener(ChangeListener listener) {
    std::lock_guard lock(mutex_);
    listeners_.push_back(std::move(listener));
}

void IncrementalManager::stop_all() {
    std::vector<std::string> ids;
    {
        std::lock_guard lock(mutex_);
        for (const auto& [id, w] : watches_) ids.push_back(id);
    }
    for (const std::string& id : ids) stop(id);
}

void IncrementalManager::reset_for_tests() {
    stop_all();
    std::lock_guard lock(mutex_);
    watches_.clear();
    listeners_.clear();
}

}  // namespace pv::incremental
