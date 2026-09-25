#pragma once
#include <cstdint>
#include <functional>
#include <map>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/graph/graph.hpp"
#include "pv/parse/raw.hpp"
#include "pv/parse/registry.hpp"
#include "pv/rpc/notifier.hpp"
#include "pv/session/project.hpp"

namespace pv::incremental {

struct FileState {
    int64_t mtime_ns = 0;
    std::uintmax_t size = 0;
};
using StateMap = std::map<std::string, FileState>;  // rel path -> state

struct ChangeSet {
    std::vector<std::string> added, modified, removed;
    bool empty() const;
};

struct GraphDiff {
    std::vector<std::string> added, removed, updated;
};

using ExtractionMap = std::map<std::string, parse::FileExtraction>;
using ChangeListener =
    std::function<void(const std::string& project_id, const std::vector<std::string>& files_changed, const GraphDiff& diff)>;

StateMap scan_states(const std::string& root, const parse::AdapterRegistry& adapters, const std::vector<std::string>& excludes);
ChangeSet diff_states(const StateMap& before, const StateMap& after);
graph::Graph rebuild_graph(const parse::AdapterRegistry& adapters, const std::string& root, const ExtractionMap& extractions);
GraphDiff diff_graphs(const graph::Graph& before, const graph::Graph& after);

// Keeps each watched project's graph in sync with its files: polls file states, re-parses changed files only,
// relinks everything from the cached extractions, swaps the graph and sends graph.changed.
class IncrementalManager {
public:
    ~IncrementalManager();
    void start(std::shared_ptr<session::Project> project, const parse::AdapterRegistry& adapters, rpc::Notifier& notifier,
               int interval_ms);
    void stop(const std::string& project_id);
    nlohmann::json status(const std::string& project_id) const;  // {watching, interval_ms, seeded, last_change_ms}
    // Returns the files changed. Public for tests.
    std::vector<std::string> apply_changes(session::Project& project, const parse::AdapterRegistry& adapters, rpc::Notifier& notifier,
                                           const ChangeSet& changes);
    void seed(session::Project& project, const parse::AdapterRegistry& adapters);  // full extraction into the cache
    void add_listener(ChangeListener listener);
    void stop_all();
    void reset_for_tests();

private:
    struct Watch;
    std::shared_ptr<Watch> watch_for(const std::string& project_id);
    std::shared_ptr<Watch> find_watch(const std::string& project_id) const;
    mutable std::mutex mutex_;
    std::map<std::string, std::shared_ptr<Watch>> watches_;
    std::vector<ChangeListener> listeners_;
};

IncrementalManager& manager();

}  // namespace pv::incremental
