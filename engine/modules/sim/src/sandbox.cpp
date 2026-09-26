#include <algorithm>
#include <chrono>
#include <set>

#include "pv/core/error.hpp"
#include "pv/core/ids.hpp"
#include "pv/impact/impact.hpp"
#include "pv/sim/sim.hpp"

namespace pv::sim {

namespace {

const std::set<std::string> kKinds{"delete_node", "remove_edge", "add_edge", "set_latency", "set_error_rate", "rename", "move"};

std::string str(const nlohmann::json& j, const char* key) {
    return j.contains(key) && j[key].is_string() ? j[key].get<std::string>() : "";
}

void require_node(const graph::Graph& g, const std::string& id, const char* what) {
    if (id.empty()) throw core::PvError(core::err::InvalidParams, std::string("missing ") + what);
    if (!g.find_node(id)) throw core::PvError(core::err::NodeNotFound, "node not found: " + id);
}

std::vector<std::string> impact_of(const graph::Graph& g, const std::string& id) {
    std::vector<std::string> out;
    for (const auto& a : impact::analyze_impact(g, id, 5).affected) out.push_back(a.node_id);
    return out;
}

}  // namespace

SimChange change_from_json(const nlohmann::json& j) {
    if (!j.is_object()) throw core::PvError(core::err::InvalidParams, "change must be an object");
    SimChange c;
    c.kind = str(j, "kind");
    if (!kKinds.count(c.kind)) throw core::PvError(core::err::InvalidParams, "unknown change kind: " + c.kind);
    c.node_id = str(j, "node_id");
    c.source_id = str(j, "source_id");
    c.target_id = str(j, "target_id");
    c.edge_kind = str(j, "edge_kind");
    c.new_name = str(j, "new_name");
    c.new_parent_id = str(j, "new_parent_id");
    if (j.contains("factor")) c.factor = j["factor"].get<double>();
    if (j.contains("rate")) c.rate = j["rate"].get<double>();
    if (c.factor < 0.1 || c.factor > 100) throw core::PvError(core::err::InvalidParams, "factor must be 0.1-100");
    if (c.rate < 0 || c.rate > 1) throw core::PvError(core::err::InvalidParams, "rate must be 0-1");
    return c;
}

std::vector<std::string> apply_change(Sandbox& sb, graph::Graph& g, const SimChange& c) {
    std::vector<std::string> affected;
    if (c.kind == "delete_node") {
        require_node(g, c.node_id, "node_id");
        std::vector<std::string> stack{c.node_id};
        while (!stack.empty()) {  // the node and everything inside it
            const std::string id = stack.back();
            stack.pop_back();
            sb.deleted_nodes.insert(id);
            for (const core::Node* ch : g.children(id)) stack.push_back(ch->id);
        }
        affected = impact_of(g, c.node_id);
    } else if (c.kind == "remove_edge") {
        require_node(g, c.source_id, "source_id");
        require_node(g, c.target_id, "target_id");
        sb.removed_edges.insert(c.source_id + "|" + c.target_id);
        affected = impact_of(g, c.target_id);
        affected.push_back(c.source_id);
    } else if (c.kind == "add_edge") {
        require_node(g, c.source_id, "source_id");
        require_node(g, c.target_id, "target_id");
        const auto kind = core::edge_kind_from_string(c.edge_kind.empty() ? "calls" : c.edge_kind);
        if (!kind) throw core::PvError(core::err::InvalidParams, "unknown edge_kind: " + c.edge_kind);
        core::Edge e;
        e.kind = *kind;
        e.source_id = c.source_id;
        e.target_id = c.target_id;
        e.id = core::make_edge_id(*kind, c.source_id, c.target_id);
        e.resolved = false;
        g.add_edge(e);
        sb.removed_edges.erase(c.source_id + "|" + c.target_id);
        affected = {c.source_id, c.target_id};
    } else if (c.kind == "set_latency") {
        require_node(g, c.node_id, "node_id");
        sb.latency_factor[c.node_id] = c.factor;
        affected = {c.node_id};
    } else if (c.kind == "set_error_rate") {
        require_node(g, c.node_id, "node_id");
        sb.error_rate[c.node_id] = c.rate;
        affected = {c.node_id};
    } else {  // rename, move: recorded; the static impact tells what depends on the node
        require_node(g, c.node_id, "node_id");
        if (c.kind == "move") require_node(g, c.new_parent_id, "new_parent_id");
        if (c.kind == "rename" && c.new_name.empty()) throw core::PvError(core::err::InvalidParams, "missing new_name");
        affected = impact_of(g, c.node_id);
    }
    sb.changes.push_back(c);
    std::sort(affected.begin(), affected.end());
    affected.erase(std::unique(affected.begin(), affected.end()), affected.end());
    return affected;
}

SandboxManager& sandboxes() {
    static SandboxManager instance;
    return instance;
}

Sandbox& SandboxManager::create(session::ProjectManager& pm, const std::string& project_id, const std::string& label) {
    const auto base = pm.get_ready(project_id);
    graph::Graph copy = base->read([](const graph::Graph& g) { return g; });
    auto sb = std::make_unique<Sandbox>();
    sb->base_project_id = project_id;
    sb->label = label.empty() ? "what-if" : label;
    sb->created_ms =
        std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    sb->view_project_id = pm.adopt("sim-" + sb->label, std::move(copy));
    std::lock_guard<std::mutex> lock(mutex_);
    sb->id = "s" + std::to_string(++counter_);
    Sandbox& ref = *sb;
    sandboxes_[sb->id] = std::move(sb);
    return ref;
}

Sandbox& SandboxManager::get(const std::string& id) {
    std::lock_guard<std::mutex> lock(mutex_);
    const auto it = sandboxes_.find(id);
    if (it == sandboxes_.end()) throw core::PvError(core::err::InvalidParams, "sandbox not found: " + id);
    return *it->second;
}

std::vector<const Sandbox*> SandboxManager::list(const std::string& project_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<const Sandbox*> out;
    for (const auto& [id, sb] : sandboxes_) {
        if (sb->base_project_id == project_id) out.push_back(sb.get());
    }
    return out;
}

void SandboxManager::discard(session::ProjectManager& pm, const std::string& id) {
    std::string view;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        const auto it = sandboxes_.find(id);
        if (it == sandboxes_.end()) throw core::PvError(core::err::InvalidParams, "sandbox not found: " + id);
        view = it->second->view_project_id;
        sandboxes_.erase(it);
    }
    try {
        pm.close(view);
    } catch (const core::PvError&) {
        // the view project was closed already
    }
}

void SandboxManager::reset_for_tests() {
    std::lock_guard<std::mutex> lock(mutex_);
    sandboxes_.clear();
}

}  // namespace pv::sim
