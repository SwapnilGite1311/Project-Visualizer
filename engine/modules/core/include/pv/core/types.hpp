#pragma once
#include <optional>
#include <string>

namespace pv::core {

enum class NodeKind { Project, Package, Module, Class, Function, Method, Variable, Statement, External };
enum class EdgeKind { Imports, Calls, Inherits, References };
enum class Health { Unknown, Ok, Warning, Stalled, Error };

struct Span {
    int start_line = 0;
    int start_col = 0;
    int end_line = 0;
    int end_col = 0;
};

struct Metrics {
    int loc = 0;
    int complexity = 0;
    int fan_in = 0;
    int fan_out = 0;
};

struct Node {
    std::string id;
    NodeKind kind = NodeKind::Module;
    std::string name;
    std::string qualified_name;
    std::string file_path;
    std::string language;
    Span span;
    int level = 0;
    std::string parent_id;
    Metrics metrics;
    Health health = Health::Unknown;
};

struct Edge {
    std::string id;
    EdgeKind kind = EdgeKind::Calls;
    std::string source_id;
    std::string target_id;
    int weight = 1;
    bool resolved = true;
};

std::string to_string(NodeKind kind);
std::string to_string(EdgeKind kind);
std::string to_string(Health health);
std::optional<NodeKind> node_kind_from_string(const std::string& text);
std::optional<EdgeKind> edge_kind_from_string(const std::string& text);
std::optional<Health> health_from_string(const std::string& text);

}  // namespace pv::core
