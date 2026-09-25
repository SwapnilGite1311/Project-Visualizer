#include "pv/errmap/errmap.hpp"
#include "pv/locate/locate.hpp"

namespace pv::errmap {
namespace {

bool ends_with(const std::string& s, const std::string& suffix) {
    return s.size() >= suffix.size() && s.compare(s.size() - suffix.size(), suffix.size(), suffix) == 0;
}

// The project file a frame points at, or "".
std::string frame_file(const Frame& f, const graph::Graph& g, const std::string& root_path) {
    if (const auto rel = locate::to_project_relative(root_path, f.file_path); rel && !g.nodes_in_file(*rel).empty()) return *rel;
    const bool bare_name = f.file_path.find('/') == std::string::npos && f.file_path.find('\\') == std::string::npos;
    if (bare_name && !f.file_path.empty()) {  // Java frames name only the file: "Helper.java"
        for (const core::Node* n : g.all_nodes()) {
            if (n->kind == core::NodeKind::Module && (n->file_path == f.file_path || ends_with(n->file_path, "/" + f.file_path))) {
                return n->file_path;
            }
        }
    }
    const std::size_t dot = f.function.rfind('.');
    if (dot != std::string::npos) {  // "com.acme.App.main" -> module "com.acme.App"
        const std::string owner = f.function.substr(0, dot);
        for (const core::Node* n : g.all_nodes()) {
            if (n->kind == core::NodeKind::Module && n->qualified_name == owner) return n->file_path;
        }
    }
    return "";
}

}  // namespace

void map_frames(ParsedTrace& t, const graph::Graph& g, const std::string& root_path) {
    for (Frame& f : t.frames) {
        const std::string file = frame_file(f, g, root_path);
        const core::Node* node = file.empty() ? nullptr : g.innermost_at(file, f.line);
        f.node_id = node ? node->id : "";
        f.in_project = node != nullptr;
    }
}

}  // namespace pv::errmap
