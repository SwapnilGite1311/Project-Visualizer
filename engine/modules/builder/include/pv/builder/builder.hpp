#pragma once
#include <functional>
#include <string>
#include <unordered_map>
#include <vector>
#include "pv/fs/fs.hpp"
#include "pv/graph/graph.hpp"
#include "pv/parse/registry.hpp"

namespace pv::builder {

using FileBindings = std::unordered_map<std::string, std::string>;  // local name -> node id

struct BuildResult {
    graph::Graph graph;
    int files_parsed = 0;
    int files_failed = 0;
    std::vector<std::string> errors;              // "<rel_path>: <message>"
    std::vector<std::string> main_guard_files;    // sorted
    std::vector<std::string> syntax_error_files;  // sorted
};

core::NodeKind definition_kind(const parse::RawDefinition& def);
void add_structure_nodes(graph::Graph& g, const std::string& root_path, const std::vector<std::string>& rel_files,
                         const std::function<std::string(const std::string&)>& language_of);
std::vector<parse::FileExtraction> extract_all(const parse::AdapterRegistry& adapters,
                                               const std::vector<fs::DiscoveredFile>& files,
                                               const std::function<void(int, int)>& on_progress, int threads,
                                               std::vector<std::string>& errors);
void add_definition_nodes(graph::Graph& g, const parse::FileExtraction& fx, const parse::LanguageAdapter& adapter);
parse::ProjectIndex build_index(const std::vector<parse::FileExtraction>& fxs, const parse::AdapterRegistry& adapters);
FileBindings link_imports(graph::Graph& g, const parse::FileExtraction& fx, const parse::LanguageAdapter& adapter,
                          const parse::ProjectIndex& index);
void link_calls(graph::Graph& g, const parse::FileExtraction& fx, const parse::LanguageAdapter& adapter,
                const parse::ProjectIndex& index, const FileBindings& bindings);
void link_inherits(graph::Graph& g, const parse::FileExtraction& fx, const parse::ProjectIndex& index,
                   const FileBindings& bindings);
void compute_metrics(graph::Graph& g);
BuildResult build_project(const parse::AdapterRegistry& adapters, const std::string& root_path,
                          const std::vector<fs::DiscoveredFile>& files,
                          const std::function<void(int done, int total)>& on_progress,
                          const std::function<void(const std::string& phase)>& on_phase, int threads = 0);

}  // namespace pv::builder
