#include "pv/session/project_manager.hpp"

#include <chrono>

#include "pv/builder/builder.hpp"
#include "pv/core/error.hpp"
#include "pv/core/paths.hpp"
#include "pv/fs/fs.hpp"

namespace pv::session {

ProjectManager::ProjectManager(const parse::AdapterRegistry& adapters, rpc::Notifier& notifier)
    : adapters_(adapters), notifier_(notifier) {}

ProjectManager::~ProjectManager() {
    std::vector<std::thread> threads;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        threads.swap(threads_);
    }
    for (std::thread& t : threads) {
        if (t.joinable()) t.join();
    }
}

std::string ProjectManager::open(const std::string& root_path, const OpenOptions& options) {
    const std::string root = core::normalize_path(root_path);
    std::lock_guard<std::mutex> lock(mutex_);
    for (const auto& [id, project] : projects_) {
        if (project->root_path() == root) return id;
    }
    const std::string id = "p" + std::to_string(++counter_);
    auto project = std::make_shared<Project>(id, root);
    projects_[id] = project;
    threads_.emplace_back([this, project, options] { load_now(project, options); });
    return id;
}

std::string ProjectManager::adopt(const std::string& label, graph::Graph graph) {
    int modules = 0;
    for (const core::Node* n : graph.all_nodes()) {
        if (n->kind == core::NodeKind::Module) ++modules;
    }
    std::lock_guard<std::mutex> lock(mutex_);
    const std::string id = "p" + std::to_string(++counter_);
    auto project = std::make_shared<Project>(id, "snapshot:" + label);
    project->replace_graph(std::move(graph));
    project->set_progress(modules, modules);
    project->set_state(ProjectState::Ready);
    projects_[id] = project;
    return id;
}

std::shared_ptr<Project> ProjectManager::get(const std::string& id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = projects_.find(id);
    if (it == projects_.end()) throw core::PvError(core::err::ProjectNotFound, "project not found: " + id);
    return it->second;
}

std::shared_ptr<Project> ProjectManager::get_ready(const std::string& id) const {
    std::shared_ptr<Project> project = get(id);
    project->require_ready();
    return project;
}

void ProjectManager::close(const std::string& id) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (projects_.erase(id) == 0) throw core::PvError(core::err::ProjectNotFound, "project not found: " + id);
}

std::vector<std::string> ProjectManager::ids() const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<std::string> out;
    for (const auto& [id, project] : projects_) out.push_back(id);
    return out;
}

bool ProjectManager::wait_until_settled(const std::string& id, int timeout_ms) const {
    const std::shared_ptr<Project> project = get(id);
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(timeout_ms);
    while (std::chrono::steady_clock::now() < deadline) {
        const ProjectState state = project->state();
        if (state == ProjectState::Ready) return true;
        if (state == ProjectState::Error) return false;
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    return false;
}

void ProjectManager::load_now(const std::shared_ptr<Project>& project, const OpenOptions& options) {
    try {
        project->set_state(ProjectState::Scanning);
        notify_progress(*project);
        fs::DiscoverOptions dopt;
        dopt.extensions = adapters_.all_extensions();
        dopt.exclude_globs = options.exclude_globs;
        fs::DiscoverResult found = fs::discover_files(project->root_path(), dopt);
        project->set_progress(0, static_cast<int>(found.files.size()));
        project->set_state(ProjectState::Parsing);
        notify_progress(*project);
        builder::BuildResult result = builder::build_project(
            adapters_, project->root_path(), found.files,
            [&](int done, int total) {
                project->set_progress(done, total);
                if (done % 50 == 0 || done == total) notify_progress(*project);
            },
            [&](const std::string& phase) {
                if (phase == "linking") {
                    project->set_state(ProjectState::Linking);
                    notify_progress(*project);
                }
            });
        project->set_build_info(result.main_guard_files, result.syntax_error_files, result.errors);
        project->replace_graph(std::move(result.graph));
        project->set_state(ProjectState::Ready);
        notify_progress(*project);
    } catch (const std::exception& e) {
        project->set_error(e.what());
        notify_progress(*project);
    }
}

void ProjectManager::notify_progress(const Project& project) {
    notifier_.notify("project.progress", rpc::Json{{"project_id", project.id()},
                                                   {"state", to_string(project.state())},
                                                   {"files_total", project.files_total()},
                                                   {"files_done", project.files_done()}});
}

}  // namespace pv::session
