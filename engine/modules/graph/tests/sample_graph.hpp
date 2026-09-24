#pragma once
#include "pv/core/ids.hpp"
#include "pv/graph/graph.hpp"

namespace pv::graph::testing {

inline core::Node make_node(core::NodeKind kind, const std::string& id, const std::string& parent,
                            const std::string& file, int start_line, int end_line) {
    core::Node n;
    n.id = id;
    n.kind = kind;
    n.name = id.substr(id.find_last_of(":#.") + 1);
    n.qualified_name = n.name;
    n.file_path = file;
    n.parent_id = parent;
    n.level = core::level_of(kind);
    n.span = core::Span{start_line, 0, end_line, 0};
    return n;
}

inline core::Edge make_edge(core::EdgeKind kind, const std::string& src, const std::string& dst, int weight = 1) {
    core::Edge e;
    e.kind = kind;
    e.source_id = src;
    e.target_id = dst;
    e.weight = weight;
    e.id = core::make_edge_id(kind, src, dst);
    return e;
}

// project:
// ├── package:app
// │   └── module:app/a.py            (lines 1-20)
// │       ├── function:app/a.py#f    (lines 2-5)
// │       └── class:app/a.py#C       (lines 7-20)
// │           └── method:app/a.py#C.m (lines 8-12)
// ├── module:main.py                 (lines 1-10)
// │   └── function:main.py#main      (lines 1-10)
// └── external:os
// edges: calls main->f (1), calls main->C.m (2), imports main.py->app/a.py (1),
//        imports app/a.py->os (1), calls f->C.m (1)
inline Graph sample_graph() {
    using core::NodeKind;
    using core::EdgeKind;
    Graph g;
    g.add_node(make_node(NodeKind::Project, "project:", "", "", 0, 0));
    g.add_node(make_node(NodeKind::Package, "package:app", "project:", "", 0, 0));
    g.add_node(make_node(NodeKind::Module, "module:app/a.py", "package:app", "app/a.py", 1, 20));
    g.add_node(make_node(NodeKind::Function, "function:app/a.py#f", "module:app/a.py", "app/a.py", 2, 5));
    g.add_node(make_node(NodeKind::Class, "class:app/a.py#C", "module:app/a.py", "app/a.py", 7, 20));
    g.add_node(make_node(NodeKind::Method, "method:app/a.py#C.m", "class:app/a.py#C", "app/a.py", 8, 12));
    g.add_node(make_node(NodeKind::Module, "module:main.py", "project:", "main.py", 1, 10));
    g.add_node(make_node(NodeKind::Function, "function:main.py#main", "module:main.py", "main.py", 1, 10));
    g.add_node(make_node(NodeKind::External, "external:os", "project:", "", 0, 0));
    g.add_edge(make_edge(EdgeKind::Calls, "function:main.py#main", "function:app/a.py#f", 1));
    g.add_edge(make_edge(EdgeKind::Calls, "function:main.py#main", "method:app/a.py#C.m", 2));
    g.add_edge(make_edge(EdgeKind::Imports, "module:main.py", "module:app/a.py", 1));
    g.add_edge(make_edge(EdgeKind::Imports, "module:app/a.py", "external:os", 1));
    g.add_edge(make_edge(EdgeKind::Calls, "function:app/a.py#f", "method:app/a.py#C.m", 1));
    return g;
}

}  // namespace pv::graph::testing
