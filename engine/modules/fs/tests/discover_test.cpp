#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/fs/fs.hpp"
#include "temp_tree.hpp"

using namespace pv;
using namespace pv::fs;

namespace {

std::vector<std::string> rel_paths(const DiscoverResult& r) {
    std::vector<std::string> out;
    for (const DiscoveredFile& f : r.files) out.push_back(f.rel_path);
    return out;
}

}  // namespace

TEST(FsDiscover, BasicWalk) {
    pv::fs::testing::TempTree tree;
    tree.write("a.py", "x = 1\n");
    tree.write("pkg/b.py", "y = 2\n");
    tree.write("pkg/c.txt", "text\n");
    tree.write("z/y/x.py", "z = 3\n");

    DiscoverOptions py;
    py.extensions = {".py"};
    const DiscoverResult r = discover_files(tree.root(), py);
    EXPECT_EQ(rel_paths(r), (std::vector<std::string>{"a.py", "pkg/b.py", "z/y/x.py"}));
    for (const DiscoveredFile& f : r.files) {
        EXPECT_EQ(f.abs_path.substr(f.abs_path.size() - f.rel_path.size()), f.rel_path);
    }
    EXPECT_EQ(discover_files(tree.root(), DiscoverOptions{}).files.size(), 4u);
}

TEST(FsDiscover, MissingRootThrows) {
    try {
        discover_files("definitely/not/a/folder", DiscoverOptions{});
        FAIL() << "expected PvError";
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::Io);
    }
}

TEST(FsDiscover, ExcludesAndPruning) {
    pv::fs::testing::TempTree tree;
    tree.write("app/main.py", "");
    tree.write("node_modules/lib/x.py", "");
    tree.write("web/node_modules/y.py", "");
    tree.write(".venv/lib/z.py", "");
    tree.write("app/__pycache__/m.py", "");
    tree.write("tests/t.py", "");
    DiscoverOptions opts;
    opts.extensions = {".py"};
    EXPECT_EQ(rel_paths(discover_files(tree.root(), opts)), (std::vector<std::string>{"app/main.py", "tests/t.py"}));
    opts.exclude_globs = {"tests/**"};
    EXPECT_EQ(rel_paths(discover_files(tree.root(), opts)), (std::vector<std::string>{"app/main.py"}));
}

TEST(FsDiscover, SizeLimitAndBinary) {
    pv::fs::testing::TempTree tree;
    tree.write("big.py", "12345678901234567890");
    tree.write("bin.py", std::string("a\0b", 3));
    tree.write("ok.py", "x=1");
    DiscoverOptions opts;
    opts.extensions = {".py"};
    opts.max_file_bytes = 10;
    const DiscoverResult r = discover_files(tree.root(), opts);
    EXPECT_EQ(rel_paths(r), (std::vector<std::string>{"ok.py"}));
    EXPECT_EQ(r.skipped, (std::vector<std::string>{"big.py (too large)", "bin.py (binary)"}));
}

TEST(FsDiscover, GitIgnore) {
    pv::fs::testing::TempTree tree;
    tree.write(".gitignore", "gen/\n*.tmp.py\n");
    tree.write("gen/a.py", "");
    tree.write("b.tmp.py", "");
    tree.write("c.py", "");
    tree.write("sub/.gitignore", "local.py\n");
    tree.write("sub/local.py", "");
    tree.write("sub/keep.py", "");
    DiscoverOptions opts;
    opts.extensions = {".py"};
    EXPECT_EQ(rel_paths(discover_files(tree.root(), opts)), (std::vector<std::string>{"c.py", "sub/keep.py"}));
    opts.use_gitignore = false;
    EXPECT_EQ(discover_files(tree.root(), opts).files.size(), 5u);
}
