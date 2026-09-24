#include "pv/core/types.hpp"

namespace pv::core {

std::string to_string(NodeKind kind) {
    switch (kind) {
        case NodeKind::Project: return "project";
        case NodeKind::Package: return "package";
        case NodeKind::Module: return "module";
        case NodeKind::Class: return "class";
        case NodeKind::Function: return "function";
        case NodeKind::Method: return "method";
        case NodeKind::Variable: return "variable";
        case NodeKind::Statement: return "statement";
        case NodeKind::External: return "external";
    }
    return "module";
}

std::string to_string(EdgeKind kind) {
    switch (kind) {
        case EdgeKind::Imports: return "imports";
        case EdgeKind::Calls: return "calls";
        case EdgeKind::Inherits: return "inherits";
        case EdgeKind::References: return "references";
    }
    return "calls";
}

std::string to_string(Health health) {
    switch (health) {
        case Health::Unknown: return "unknown";
        case Health::Ok: return "ok";
        case Health::Warning: return "warning";
        case Health::Stalled: return "stalled";
        case Health::Error: return "error";
    }
    return "unknown";
}

std::optional<NodeKind> node_kind_from_string(const std::string& text) {
    if (text == "project") return NodeKind::Project;
    if (text == "package") return NodeKind::Package;
    if (text == "module") return NodeKind::Module;
    if (text == "class") return NodeKind::Class;
    if (text == "function") return NodeKind::Function;
    if (text == "method") return NodeKind::Method;
    if (text == "variable") return NodeKind::Variable;
    if (text == "statement") return NodeKind::Statement;
    if (text == "external") return NodeKind::External;
    return std::nullopt;
}

std::optional<EdgeKind> edge_kind_from_string(const std::string& text) {
    if (text == "imports") return EdgeKind::Imports;
    if (text == "calls") return EdgeKind::Calls;
    if (text == "inherits") return EdgeKind::Inherits;
    if (text == "references") return EdgeKind::References;
    return std::nullopt;
}

std::optional<Health> health_from_string(const std::string& text) {
    if (text == "unknown") return Health::Unknown;
    if (text == "ok") return Health::Ok;
    if (text == "warning") return Health::Warning;
    if (text == "stalled") return Health::Stalled;
    if (text == "error") return Health::Error;
    return std::nullopt;
}

int level_of(NodeKind kind) {
    switch (kind) {
        case NodeKind::Project: return 0;
        case NodeKind::Package: return 1;
        case NodeKind::External: return 1;
        case NodeKind::Module: return 2;
        case NodeKind::Class: return 3;
        case NodeKind::Function: return 4;
        case NodeKind::Method: return 4;
        case NodeKind::Variable: return 5;
        case NodeKind::Statement: return 5;
    }
    return 0;
}

int severity(Health health) {
    switch (health) {
        case Health::Unknown: return 0;
        case Health::Ok: return 1;
        case Health::Warning: return 2;
        case Health::Stalled: return 3;
        case Health::Error: return 4;
    }
    return 0;
}

Health worst(Health a, Health b) {
    return severity(b) > severity(a) ? b : a;
}

}  // namespace pv::core
