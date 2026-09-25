#pragma once
#include <cstdint>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/graph/graph.hpp"

namespace pv::motion {

struct Step {
    int i = 0;
    std::string kind, node_id, file;
    int line = 0, depth = 0;
    std::int64_t t_ns = 0;
    nlohmann::json locals = nlohmann::json::object();
    std::string value;
};

struct LoadedTrace {
    std::vector<Step> steps;
    std::vector<std::string> argv;
    std::optional<int> exit_code;
    bool truncated = false;
    int skipped_lines = 0;
};

// Reads a pv-trace JSONL file (contracts/motion/trace-event.schema.json) and maps each event to the
// innermost graph node at its file and line.
LoadedTrace load_trace_file(const graph::Graph& g, const std::string& path, std::size_t max_steps = 500000);

struct FunctionCount {
    std::string node_id;
    int calls = 0;
};
std::vector<FunctionCount> function_counts(const LoadedTrace& t);  // call steps per non-empty node_id; calls desc, then node_id
const Step* last_exception(const LoadedTrace& t);                  // nullptr if none; normal exits are ignored

class TraceStore {  // thread-safe; keeps the 3 newest traces
public:
    std::string add(LoadedTrace trace);  // "t1", "t2", …
    std::shared_ptr<const LoadedTrace> get(const std::string& id) const;
    bool remove(const std::string& id);

private:
    mutable std::mutex mutex_;
    int next_ = 1;
    std::vector<std::pair<std::string, std::shared_ptr<const LoadedTrace>>> traces_;
};

}  // namespace pv::motion
