#include <algorithm>
#include <atomic>
#include <chrono>
#include <thread>

#include "pv/builder/builder.hpp"
#include "pv/core/log.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"
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

}  // namespace

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
                               rpc::Notifier& notifier, int interval_ms) {
    const auto w = watch_for(project->id());
    w->interval_ms = interval_ms;
    if (w->watching) return;  // already watching: only the interval changes
    if (w->worker.joinable()) w->worker.join();
    w->stop = false;
    w->watching = true;
    w->worker = std::thread([this, w, project, &adapters, &notifier] {
        try {
            if (!w->seeded) seed(*project, adapters);
            while (!w->stop) {
                for (int waited = 0; waited < w->interval_ms && !w->stop; waited += 50) {
                    std::this_thread::sleep_for(std::chrono::milliseconds(50));
                }
                if (w->stop) break;
                if (project.use_count() == 1) break;  // the project was closed: this thread holds the last reference
                const StateMap after = scan_states(project->root_path(), adapters, {});
                ChangeSet changes;
                {
                    std::lock_guard lock(w->mutex);
                    changes = diff_states(w->states, after);
                    if (!changes.empty()) w->states = after;
                }
                if (!changes.empty()) apply_changes(*project, adapters, notifier, changes);
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
    if (w->worker.joinable() && w->worker.get_id() != std::this_thread::get_id()) w->worker.join();
    w->watching = false;
}

nlohmann::json IncrementalManager::status(const std::string& project_id) const {
    const auto w = find_watch(project_id);
    if (!w) return {{"watching", false}, {"interval_ms", 1000}, {"seeded", false}, {"last_change_ms", 0}};
    return {{"watching", w->watching.load()},
            {"interval_ms", w->interval_ms.load()},
            {"seeded", w->seeded.load()},
            {"last_change_ms", w->last_change_ms.load()}};
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
