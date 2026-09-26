#include <gtest/gtest.h>

#include <chrono>
#include <condition_variable>
#include <filesystem>
#include <fstream>
#include <map>
#include <mutex>
#include <random>
#include <thread>

#include "pv/fswatch/fswatch.hpp"

using namespace pv::fswatch;
namespace fsys = std::filesystem;

namespace {

struct TempDir {
    TempDir() {
        std::random_device rd;
        path = fsys::temp_directory_path() / ("pv_fswatch_" + std::to_string(rd()) + std::to_string(rd()));
        fsys::create_directories(path / "src");
        fsys::create_directories(path / "node_modules" / "lib");
    }
    ~TempDir() {
        std::error_code ec;
        fsys::remove_all(path, ec);
    }
    fsys::path path;
};

// Collects batches and waits for a predicate on the merged latest kinds.
struct Collector {
    std::mutex m;
    std::condition_variable cv;
    std::map<std::string, Change::Kind> latest;
    int batches = 0;
    bool rescan = false;
    void on(std::vector<Change> batch) {
        std::lock_guard<std::mutex> lock(m);
        ++batches;
        for (const auto& c : batch) {
            if (c.kind == Change::Kind::Rescan) rescan = true;
            else latest[c.rel_path] = c.kind;
        }
        cv.notify_all();
    }
    template <class Pred>
    bool wait(Pred pred, int ms = 3000) {
        std::unique_lock<std::mutex> lock(m);
        return cv.wait_for(lock, std::chrono::milliseconds(ms), [&] { return pred(); });
    }
};

void write_file(const fsys::path& p, const std::string& text) {
    std::ofstream(p, std::ios::binary) << text;
}

}  // namespace

TEST(FsWatch, ReportsCreateModifyDelete) {
    TempDir dir;
    write_file(dir.path / "src" / "a.py", "x = 1\n");
    Collector col;
    auto watcher = create_watcher(dir.path.generic_string(), {}, [&](std::vector<Change> b) { col.on(std::move(b)); });
    ASSERT_NE(watcher, nullptr) << "native watching should work on the dev platforms";
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    const auto started = std::chrono::steady_clock::now();
    write_file(dir.path / "src" / "b.py", "y = 2\n");
    EXPECT_TRUE(col.wait([&] { return col.latest.count("src/b.py") > 0; }));
    const auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - started).count();
    std::printf("[fswatch] create reported after %lld ms\n", static_cast<long long>(ms));

    write_file(dir.path / "src" / "a.py", "x = 2\n");
    EXPECT_TRUE(col.wait([&] { return col.latest.count("src/a.py") > 0; }));
    EXPECT_EQ(col.latest["src/a.py"], Change::Kind::Modified);

    fsys::remove(dir.path / "src" / "b.py");
    EXPECT_TRUE(col.wait([&] { return col.latest["src/b.py"] == Change::Kind::Deleted; }));
    watcher->stop();
}

TEST(FsWatch, IgnoresExcludedFolders) {
    TempDir dir;
    Collector col;
    auto watcher = create_watcher(dir.path.generic_string(), {"**/*.tmp"}, [&](std::vector<Change> b) { col.on(std::move(b)); });
    ASSERT_NE(watcher, nullptr);
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    write_file(dir.path / "node_modules" / "lib" / "x.js", "1");
    write_file(dir.path / "src" / "scratch.tmp", "1");
    write_file(dir.path / "src" / "kept.py", "1");
    EXPECT_TRUE(col.wait([&] { return col.latest.count("src/kept.py") > 0; }));
    std::this_thread::sleep_for(std::chrono::milliseconds(150));
    std::lock_guard<std::mutex> lock(col.m);
    for (const auto& [path, kind] : col.latest) {
        EXPECT_EQ(path.find("node_modules"), std::string::npos) << path;
        EXPECT_EQ(path.find(".tmp"), std::string::npos) << path;
    }
}

TEST(FsWatch, DebouncesBursts) {
    TempDir dir;
    Collector col;
    auto watcher = create_watcher(dir.path.generic_string(), {}, [&](std::vector<Change> b) { col.on(std::move(b)); }, 80);
    ASSERT_NE(watcher, nullptr);
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    for (int i = 0; i < 10; ++i) write_file(dir.path / "src" / "burst.py", "v = " + std::to_string(i) + "\n");
    EXPECT_TRUE(col.wait([&] { return col.latest.count("src/burst.py") > 0; }));
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    std::lock_guard<std::mutex> lock(col.m);
    EXPECT_LE(col.batches, 3);  // ten writes arrive as one (rarely two or three) batches
}

TEST(FsWatch, MissingRootGivesNoWatcher) {
    EXPECT_EQ(create_watcher("Z:/definitely/not/here/pv", {}, [](std::vector<Change>) {}), nullptr);
}

TEST(FsWatch, StopIsIdempotentAndSilent) {
    TempDir dir;
    Collector col;
    auto watcher = create_watcher(dir.path.generic_string(), {}, [&](std::vector<Change> b) { col.on(std::move(b)); });
    ASSERT_NE(watcher, nullptr);
    watcher->stop();
    watcher->stop();
    write_file(dir.path / "src" / "late.py", "1");
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    std::lock_guard<std::mutex> lock(col.m);
    EXPECT_EQ(col.batches, 0);
}
