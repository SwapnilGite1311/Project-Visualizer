#include <gtest/gtest.h>

#include <algorithm>

#include "pv/builder/builder.hpp"
#include "pv/core/text.hpp"
#include "pv/fs/fs.hpp"
#include "pv/incremental/incremental.hpp"
#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;

namespace {

bool contains(const std::vector<std::string>& v, const std::string& s) { return std::find(v.begin(), v.end(), s) != v.end(); }

}  // namespace

TEST(IncrRebuild, SameGraphAsAFullBuildAndDiffs) {
    parse::AdapterRegistry adapters;
    adapters.add(std::make_unique<lang_python::PythonAdapter>());
    const std::string root = session::pyproj_small_path();
    fs::DiscoverOptions options;
    options.extensions = adapters.all_extensions();
    const auto files = fs::discover_files(root, options).files;
    std::vector<std::string> errors;
    incremental::ExtractionMap extractions;
    for (auto& fx : builder::extract_all(adapters, files, nullptr, 1, errors)) extractions[fx.file_path] = fx;

    const graph::Graph before = incremental::rebuild_graph(adapters, root, extractions);
    const builder::BuildResult full = builder::build_project(adapters, root, files, nullptr, nullptr, 1);
    EXPECT_EQ(before.node_count(), full.graph.node_count());
    EXPECT_EQ(before.edge_count(), full.graph.edge_count());
    EXPECT_EQ(before.node_count(), 25u);
    EXPECT_EQ(before.edge_count(), 19u);
    EXPECT_TRUE(incremental::diff_graphs(before, before).added.empty());

    // Remove is_valid from app/utils.py.
    parse::FileExtraction& utils = extractions.at("app/utils.py");
    utils.definitions.erase(std::remove_if(utils.definitions.begin(), utils.definitions.end(),
                                           [](const parse::RawDefinition& d) { return d.qualname == "is_valid"; }),
                            utils.definitions.end());
    const graph::Graph after = incremental::rebuild_graph(adapters, root, extractions);
    const incremental::GraphDiff diff = incremental::diff_graphs(before, after);
    EXPECT_TRUE(contains(diff.removed, "function:app/utils.py#is_valid"));
    EXPECT_TRUE(diff.added.empty());
    // Its callers now call one thing less.
    bool caller_updated = false;
    for (const core::Edge* e : before.in_edges("function:app/utils.py#is_valid")) {
        if (e->kind == core::EdgeKind::Calls && contains(diff.updated, e->source_id)) caller_updated = true;
    }
    EXPECT_TRUE(caller_updated);
}
