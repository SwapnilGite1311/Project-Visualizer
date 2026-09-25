#include <gtest/gtest.h>

#include "incr_fixture.hpp"
#include "pv/incremental/incremental.hpp"
#include "pv/lang_python/python_adapter.hpp"

using namespace pv;
using namespace pv::incremental::testing;

TEST(IncrStates, AddedModifiedRemoved) {
    TempDir dir;
    write_text(dir.path / "a.py", "def a():\n    return 1\n");
    write_text(dir.path / "b.py", "def b():\n    return 2\n");
    write_text(dir.path / "notes.txt", "not code\n");
    parse::AdapterRegistry adapters;
    adapters.add(std::make_unique<lang_python::PythonAdapter>());

    const incremental::StateMap before = incremental::scan_states(dir.str(), adapters, {});
    ASSERT_EQ(before.size(), 2u);  // only files a language adapter reads
    EXPECT_TRUE(incremental::diff_states(before, before).empty());

    write_text(dir.path / "a.py", "def a():\n    return 10\n");
    write_text(dir.path / "c.py", "def c():\n    return 3\n");
    stdfs::remove(dir.path / "b.py");
    const incremental::StateMap after = incremental::scan_states(dir.str(), adapters, {});
    const incremental::ChangeSet changes = incremental::diff_states(before, after);
    EXPECT_EQ(changes.added, std::vector<std::string>{"c.py"});
    EXPECT_EQ(changes.modified, std::vector<std::string>{"a.py"});
    EXPECT_EQ(changes.removed, std::vector<std::string>{"b.py"});
    EXPECT_FALSE(changes.empty());

    const incremental::StateMap excluded = incremental::scan_states(dir.str(), adapters, {"c.py"});
    EXPECT_EQ(excluded.count("c.py"), 0u);
}
