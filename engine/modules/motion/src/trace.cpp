#include "pv/motion/trace.hpp"

#include <algorithm>
#include <map>
#include <set>
#include <sstream>

#include "pv/core/text.hpp"

namespace pv::motion {
namespace {

const std::set<std::string> kAllKinds{"start", "call", "line", "return", "exception", "end"};

std::string last_part(const std::string& qualname) {
    const std::size_t dot = qualname.rfind('.');
    return dot == std::string::npos ? qualname : qualname.substr(dot + 1);
}

// Decorators make a function's first recorded line the decorator line, so match the definition by name nearby.
const core::Node* node_for(const graph::Graph& g, const std::string& kind, const std::string& file, int line,
                           const std::string& func) {
    const core::Node* node = g.innermost_at(file, line);
    if (kind != "call" || !node || func.empty() || func == "<module>") return node;
    const std::string name = last_part(func);
    if (node->name == name) return node;
    for (const core::Node* n : g.nodes_in_file(file)) {
        if (n->name == name && n->span.start_line >= line && n->span.start_line <= line + 10) return n;
    }
    return node;
}

// Exceptions that are normal control flow, not errors.
bool is_normal_exit(const std::string& value) {
    return value == "SystemExit: 0" || value == "SystemExit: " || value.rfind("GeneratorExit", 0) == 0 ||
           value.rfind("StopIteration", 0) == 0;
}

template <class T>
T get_or(const nlohmann::json& j, const char* key, T fallback) {
    const auto it = j.find(key);
    if (it == j.end() || it->is_null()) return fallback;
    try {
        return it->get<T>();
    } catch (const nlohmann::json::exception&) {
        return fallback;
    }
}

}  // namespace

LoadedTrace load_trace_file(const graph::Graph& g, const std::string& path, std::size_t max_steps) {
    LoadedTrace trace;
    std::istringstream in(core::read_file_text(path));
    std::string line;
    std::vector<std::string> frames;  // node id of the running frame at each depth
    while (std::getline(in, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (line.empty()) continue;
        const nlohmann::json event = nlohmann::json::parse(line, nullptr, false);
        if (event.is_discarded() || !event.is_object() || !event.contains("kind") || !event["kind"].is_string() ||
            !kAllKinds.count(event["kind"].get<std::string>())) {
            ++trace.skipped_lines;
            continue;
        }
        const std::string kind = event["kind"].get<std::string>();
        if (kind == "start") {
            trace.argv = get_or<std::vector<std::string>>(event, "argv", {});
            continue;
        }
        if (kind == "end") {
            if (event.contains("exit_code") && event["exit_code"].is_number_integer()) {
                trace.exit_code = event["exit_code"].get<int>();
            }
            if (get_or<bool>(event, "truncated", false)) trace.truncated = true;
            continue;
        }
        if (trace.steps.size() >= max_steps) {
            trace.truncated = true;
            break;
        }
        Step step;
        step.i = static_cast<int>(trace.steps.size());
        step.kind = kind;
        step.file = get_or<std::string>(event, "file", "");
        step.line = get_or<int>(event, "line", 0);
        step.depth = get_or<int>(event, "depth", 0);
        step.t_ns = get_or<std::int64_t>(event, "t_ns", 0);
        if (event.contains("locals") && event["locals"].is_object()) step.locals = event["locals"];
        step.value = get_or<std::string>(event, "value", "");
        const std::size_t depth = static_cast<std::size_t>(std::max(0, step.depth));
        if (kind != "call" && depth < frames.size() && !frames[depth].empty()) {
            // A frame's lines belong to the frame, even a nested `def` line inside it.
            step.node_id = frames[depth];
        } else {
            const core::Node* node = node_for(g, kind, step.file, step.line, get_or<std::string>(event, "func", ""));
            if (node) step.node_id = node->id;
        }
        if (kind == "call") {
            frames.resize(depth);
            frames.push_back(step.node_id);
        } else if (kind == "return" && depth < frames.size()) {
            frames.resize(depth);
        }
        trace.steps.push_back(std::move(step));
    }
    return trace;
}

std::vector<FunctionCount> function_counts(const LoadedTrace& t) {
    std::map<std::string, int> counts;
    for (const Step& s : t.steps) {
        if (s.kind == "call" && !s.node_id.empty()) ++counts[s.node_id];
    }
    std::vector<FunctionCount> out;
    for (const auto& [id, n] : counts) out.push_back({id, n});
    std::stable_sort(out.begin(), out.end(), [](const FunctionCount& a, const FunctionCount& b) { return a.calls > b.calls; });
    return out;
}

const Step* last_exception(const LoadedTrace& t) {
    for (auto it = t.steps.rbegin(); it != t.steps.rend(); ++it) {
        if (it->kind == "exception" && !is_normal_exit(it->value)) return &*it;
    }
    return nullptr;
}

std::string TraceStore::add(LoadedTrace trace) {
    std::lock_guard lock(mutex_);
    std::string id = "t" + std::to_string(next_++);
    traces_.emplace_back(id, std::make_shared<const LoadedTrace>(std::move(trace)));
    if (traces_.size() > 3) traces_.erase(traces_.begin());
    return id;
}

std::shared_ptr<const LoadedTrace> TraceStore::get(const std::string& id) const {
    std::lock_guard lock(mutex_);
    for (const auto& [key, trace] : traces_) {
        if (key == id) return trace;
    }
    return nullptr;
}

bool TraceStore::remove(const std::string& id) {
    std::lock_guard lock(mutex_);
    const auto it = std::find_if(traces_.begin(), traces_.end(), [&](const auto& p) { return p.first == id; });
    if (it == traces_.end()) return false;
    traces_.erase(it);
    return true;
}

}  // namespace pv::motion
