#pragma once
#include <map>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#include "pv/graph/graph.hpp"
#include "pv/parse/registry.hpp"
#include "pv/rpc/notifier.hpp"
#include "pv/session/project.hpp"

namespace pv::session {

struct OpenOptions { std::vector<std::string> exclude_globs; };

class ProjectManager {
public:
    ProjectManager(const parse::AdapterRegistry& adapters, rpc::Notifier& notifier);
    ~ProjectManager();   // joins all loader threads
    ProjectManager(const ProjectManager&) = delete;
    ProjectManager& operator=(const ProjectManager&) = delete;
    std::string open(const std::string& root_path, const OpenOptions& options);
    std::string adopt(const std::string& label, graph::Graph graph);  // registers an already-built graph as a Ready project (used by Phase 2 shared snapshots)
    std::shared_ptr<Project> get(const std::string& id) const;        // PvError(err::ProjectNotFound, "project not found: " + id)
    std::shared_ptr<Project> get_ready(const std::string& id) const;  // get + require_ready
    void close(const std::string& id);                                // unknown id -> ProjectNotFound
    std::vector<std::string> ids() const;                              // sorted
    bool wait_until_settled(const std::string& id, int timeout_ms) const; // true if Ready, false if Error or timeout
    void load_now(const std::shared_ptr<Project>& project, const OpenOptions& options);
private:
    void notify_progress(const Project& project);
    const parse::AdapterRegistry& adapters_;
    rpc::Notifier& notifier_;
    mutable std::mutex mutex_;
    std::map<std::string, std::shared_ptr<Project>> projects_;
    std::vector<std::thread> threads_;
    int counter_ = 0;
};

}  // namespace pv::session
