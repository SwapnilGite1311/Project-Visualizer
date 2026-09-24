#pragma once
#include <mutex>
#include <shared_mutex>
#include <string>
#include <vector>
#include "pv/graph/graph.hpp"

namespace pv::session {

enum class ProjectState { Idle, Scanning, Parsing, Linking, Ready, Error };
std::string to_string(ProjectState state);   // "idle","scanning","parsing","linking","ready","error"

class Project {
public:
    Project(std::string id, std::string root_path);
    const std::string& id() const;
    const std::string& root_path() const;
    ProjectState state() const;
    void set_state(ProjectState state);
    int files_total() const;
    int files_done() const;
    void set_progress(int done, int total);
    std::string error_message() const;
    void set_error(const std::string& message);   // also sets state Error
    void set_build_info(std::vector<std::string> main_guard_files, std::vector<std::string> syntax_error_files,
                        std::vector<std::string> parse_errors);
    std::vector<std::string> main_guard_files() const;
    std::vector<std::string> syntax_error_files() const;
    std::vector<std::string> parse_errors() const;
    void require_ready() const;   // throws PvError(err::NotReady, "project not ready: " + id)

    template <class F> auto read(F&& fn) const { std::shared_lock lock(graph_mutex_); return fn(graph_); }
    template <class F> auto write(F&& fn) { std::unique_lock lock(graph_mutex_); return fn(graph_); }
    void replace_graph(graph::Graph graph);   // unique lock, move in

private:
    std::string id_;
    std::string root_path_;
    mutable std::mutex state_mutex_;
    ProjectState state_ = ProjectState::Idle;
    int files_done_ = 0;
    int files_total_ = 0;
    std::string error_;
    std::vector<std::string> main_guard_files_;
    std::vector<std::string> syntax_error_files_;
    std::vector<std::string> parse_errors_;
    mutable std::shared_mutex graph_mutex_;
    graph::Graph graph_;
};

}  // namespace pv::session
