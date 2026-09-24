#pragma once
#include <algorithm>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

#include "pv/builder/builder.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"
#include "pv/lang_python/python_adapter.hpp"

namespace pv::builder::testing {

inline std::string fixture_root() {
    return std::string(PV_ENGINE_SOURCE_DIR) + "/modules/lang_python/tests/fixtures/pyproj_small";
}

inline std::vector<fs::DiscoveredFile> fixture_files() {
    fs::DiscoverOptions options;
    options.extensions = {".py", ".pyi"};
    return fs::discover_files(fixture_root(), options).files;
}

// Structure nodes, definition nodes and the project index for all 8 fixture files (no edges yet).
struct FixtureState {
    parse::AdapterRegistry adapters;
    graph::Graph g;
    std::vector<parse::FileExtraction> fxs;
    parse::ProjectIndex index;

    FixtureState() {
        adapters.add(std::make_unique<lang_python::PythonAdapter>());
        const std::vector<fs::DiscoveredFile> files = fixture_files();
        std::vector<std::string> rels;
        for (const fs::DiscoveredFile& f : files) rels.push_back(f.rel_path);
        add_structure_nodes(g, fixture_root(), rels, [](const std::string&) { return std::string("python"); });
        const parse::LanguageAdapter& py = *adapters.by_id("python");
        for (const fs::DiscoveredFile& f : files) {
            fxs.push_back(py.extract(f.rel_path, core::read_file_text(f.abs_path)));
        }
        for (const parse::FileExtraction& fx : fxs) add_definition_nodes(g, fx, py);
        index = build_index(fxs, adapters);
    }

    const parse::FileExtraction& fx(const std::string& rel) const {
        for (const parse::FileExtraction& f : fxs) {
            if (f.file_path == rel) return f;
        }
        throw std::runtime_error("no fixture file " + rel);
    }

    const parse::LanguageAdapter& py() const { return *adapters.by_id("python"); }

    // Runs imports, calls and inheritance linking for every file.
    void link_all() {
        for (const parse::FileExtraction& f : fxs) {
            const FileBindings b = link_imports(g, f, py(), index);
            link_calls(g, f, py(), index, b);
            link_inherits(g, f, index, b);
        }
    }

    std::vector<std::string> targets(const std::string& source, core::EdgeKind kind) const {
        std::vector<std::string> out;
        for (const core::Edge* e : g.out_edges(source)) {
            if (e->kind == kind) out.push_back(e->target_id);
        }
        std::sort(out.begin(), out.end());
        return out;
    }

    std::size_t count_edges(core::EdgeKind kind) const {
        std::size_t n = 0;
        for (const core::Edge* e : g.all_edges()) {
            if (e->kind == kind) ++n;
        }
        return n;
    }
};

}  // namespace pv::builder::testing
