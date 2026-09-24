#include "pv/core/ids.hpp"

#include "pv/core/error.hpp"

namespace pv::core {

std::string make_node_id(NodeKind kind, const std::string& path, const std::string& qualname) {
    switch (kind) {
        case NodeKind::Project: return kProjectNodeId;
        case NodeKind::Package: return "package:" + path;
        case NodeKind::Module: return "module:" + path;
        case NodeKind::External: return "external:" + qualname;
        case NodeKind::Statement: throw PvError(err::InvalidParams, "use make_statement_id for statements");
        case NodeKind::Class:
        case NodeKind::Function:
        case NodeKind::Method:
        case NodeKind::Variable: return to_string(kind) + ":" + path + "#" + qualname;
    }
    throw PvError(err::InvalidParams, "unknown node kind");
}

std::string make_statement_id(const std::string& file_path, const std::string& qualname, int line) {
    return "statement:" + file_path + "#" + qualname + "@" + std::to_string(line);
}

std::optional<NodeKind> kind_of_node_id(const std::string& id) {
    const size_t colon = id.find(':');
    if (colon == std::string::npos) return std::nullopt;
    return node_kind_from_string(id.substr(0, colon));
}

}  // namespace pv::core
