#include <algorithm>
#include <map>
#include <set>

#include "pv/analysis/analysis.hpp"
#include "pv/core/paths.hpp"

namespace pv::analysis {

Json build_entry_points(const graph::Graph& g, const std::vector<std::string>& main_guard_files) {
    static const std::set<std::string> kEntryFiles = {"__main__.py", "main.py", "app.py", "manage.py",
                                                      "wsgi.py",     "asgi.py", "run.py", "cli.py"};
    const std::set<std::string> guarded(main_guard_files.begin(), main_guard_files.end());
    std::map<std::string, std::vector<std::string>> reasons;  // sorted by node id

    for (const core::Node* n : g.all_nodes()) {
        if (n->kind == core::NodeKind::Module) {
            if (guarded.count(n->file_path)) reasons[n->id].push_back("has __main__ guard");
            if (kEntryFiles.count(core::path_file_name(n->file_path))) reasons[n->id].push_back("conventional entry file name");
        } else if (n->kind == core::NodeKind::Function && n->name == "main") {
            const core::Node* parent = g.find_node(n->parent_id);
            if (parent && parent->kind == core::NodeKind::Module) reasons[n->id].push_back("function named main");
        }
    }

    Json entry_points = Json::array();
    for (const auto& [id, list] : reasons) entry_points.push_back({{"node_id", id}, {"reasons", list}});
    return Json{{"entry_points", entry_points}};
}

}  // namespace pv::analysis
