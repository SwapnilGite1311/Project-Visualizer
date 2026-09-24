#include "pv/session/project.hpp"

#include "pv/core/error.hpp"

namespace pv::session {

std::string to_string(ProjectState state) {
    switch (state) {
        case ProjectState::Idle: return "idle";
        case ProjectState::Scanning: return "scanning";
        case ProjectState::Parsing: return "parsing";
        case ProjectState::Linking: return "linking";
        case ProjectState::Ready: return "ready";
        case ProjectState::Error: return "error";
    }
    return "idle";
}

Project::Project(std::string id, std::string root_path) : id_(std::move(id)), root_path_(std::move(root_path)) {}

const std::string& Project::id() const {
    return id_;
}

const std::string& Project::root_path() const {
    return root_path_;
}

ProjectState Project::state() const {
    std::lock_guard<std::mutex> lock(state_mutex_);
    return state_;
}

void Project::set_state(ProjectState state) {
    std::lock_guard<std::mutex> lock(state_mutex_);
    state_ = state;
}

int Project::files_total() const {
    std::lock_guard<std::mutex> lock(state_mutex_);
    return files_total_;
}

int Project::files_done() const {
    std::lock_guard<std::mutex> lock(state_mutex_);
    return files_done_;
}

void Project::set_progress(int done, int total) {
    std::lock_guard<std::mutex> lock(state_mutex_);
    files_done_ = done;
    files_total_ = total;
}

std::string Project::error_message() const {
    std::lock_guard<std::mutex> lock(state_mutex_);
    return error_;
}

void Project::set_error(const std::string& message) {
    std::lock_guard<std::mutex> lock(state_mutex_);
    error_ = message;
    state_ = ProjectState::Error;
}

void Project::set_build_info(std::vector<std::string> main_guard_files, std::vector<std::string> syntax_error_files,
                             std::vector<std::string> parse_errors) {
    std::lock_guard<std::mutex> lock(state_mutex_);
    main_guard_files_ = std::move(main_guard_files);
    syntax_error_files_ = std::move(syntax_error_files);
    parse_errors_ = std::move(parse_errors);
}

std::vector<std::string> Project::main_guard_files() const {
    std::lock_guard<std::mutex> lock(state_mutex_);
    return main_guard_files_;
}

std::vector<std::string> Project::syntax_error_files() const {
    std::lock_guard<std::mutex> lock(state_mutex_);
    return syntax_error_files_;
}

std::vector<std::string> Project::parse_errors() const {
    std::lock_guard<std::mutex> lock(state_mutex_);
    return parse_errors_;
}

void Project::require_ready() const {
    if (state() != ProjectState::Ready) throw core::PvError(core::err::NotReady, "project not ready: " + id_);
}

void Project::replace_graph(graph::Graph graph) {
    std::unique_lock lock(graph_mutex_);
    graph_ = std::move(graph);
}

}  // namespace pv::session
