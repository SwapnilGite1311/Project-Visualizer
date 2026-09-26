#pragma once
#include <cstdint>
#include <map>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/graph/graph.hpp"
#include "pv/session/project_manager.hpp"

namespace pv::sim {

// One hypothetical change (contracts/rpc/sim/apply.params.schema.json $defs.change).
struct SimChange {
    std::string kind, node_id, source_id, target_id, edge_kind, new_name, new_parent_id;
    double factor = 1.0;
    double rate = 0.0;
};
SimChange change_from_json(const nlohmann::json& j);  // PvError(InvalidParams) on a bad change

// An isolated what-if copy of a project's twin. The copy is shown as its own (adopted) project; behaviour changes
// (deleted nodes, removed edges, latency and error overrides) live here and are used when traces are replayed.
struct Sandbox {
    std::string id, base_project_id, view_project_id, label;
    int64_t created_ms = 0;
    std::vector<SimChange> changes;
    std::unordered_set<std::string> deleted_nodes;
    std::unordered_set<std::string> removed_edges;           // "source|target" (any kind)
    std::unordered_map<std::string, double> latency_factor;  // node -> factor
    std::unordered_map<std::string, double> error_rate;      // node -> rate 0..1
};

// Validates and records a change; add_edge also changes the view graph. Returns the affected node ids.
std::vector<std::string> apply_change(Sandbox& sb, graph::Graph& view_graph, const SimChange& c);

class SandboxManager {
public:
    Sandbox& create(session::ProjectManager& pm, const std::string& project_id, const std::string& label);
    Sandbox& get(const std::string& id);  // PvError(InvalidParams, "sandbox not found: …")
    std::vector<const Sandbox*> list(const std::string& project_id) const;
    void discard(session::ProjectManager& pm, const std::string& id);
    std::mutex& mutex() { return mutex_; }
    void reset_for_tests();

private:
    mutable std::mutex mutex_;
    std::map<std::string, std::unique_ptr<Sandbox>> sandboxes_;
    int counter_ = 0;
};

SandboxManager& sandboxes();

}  // namespace pv::sim
