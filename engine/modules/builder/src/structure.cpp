#include "pv/builder/builder.hpp"
#include "pv/core/ids.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"

namespace pv::builder {

core::NodeKind definition_kind(const parse::RawDefinition& def) {
    if (def.kind == "class") return core::NodeKind::Class;
    return def.parent_is_class ? core::NodeKind::Method : core::NodeKind::Function;
}

void add_structure_nodes(graph::Graph& g, const std::string& root_path, const std::vector<std::string>& rel_files,
                         const std::function<std::string(const std::string&)>& language_of) {
    const std::string root_n = core::normalize_path(root_path);
    core::Node project;
    project.id = core::kProjectNodeId;
    project.kind = core::NodeKind::Project;
    project.name = core::path_file_name(root_n);
    if (project.name.empty()) project.name = root_n;
    project.qualified_name = project.name;
    project.level = 0;
    g.add_node(project);

    for (const std::string& rel : rel_files) {
        const std::string dir = core::path_parent(rel);
        if (!dir.empty()) {
            const std::vector<std::string> segments = core::split(dir, '/');
            std::string prefix;
            for (const std::string& segment : segments) {
                const std::string parent_prefix = prefix;
                prefix = prefix.empty() ? segment : prefix + "/" + segment;
                const std::string id = core::make_node_id(core::NodeKind::Package, prefix, "");
                if (g.find_node(id)) continue;
                core::Node pkg;
                pkg.id = id;
                pkg.kind = core::NodeKind::Package;
                pkg.name = segment;
                std::string qn = prefix;
                for (char& c : qn) {
                    if (c == '/') c = '.';
                }
                pkg.qualified_name = qn;
                pkg.parent_id = parent_prefix.empty() ? core::kProjectNodeId
                                                      : core::make_node_id(core::NodeKind::Package, parent_prefix, "");
                pkg.level = 1;
                g.add_node(pkg);
            }
        }
        core::Node module;
        module.id = core::make_node_id(core::NodeKind::Module, rel, "");
        module.kind = core::NodeKind::Module;
        module.name = core::path_file_name(rel);
        module.file_path = rel;
        module.language = language_of ? language_of(rel) : "";
        module.level = 2;
        module.parent_id = dir.empty() ? core::kProjectNodeId : core::make_node_id(core::NodeKind::Package, dir, "");
        g.add_node(module);
    }
}

}  // namespace pv::builder
