#include <gtest/gtest.h>

#include <sqlite3.h>

#include "cache_fixture.hpp"
#include "pv/cache/project_cache.hpp"

using namespace pv;
using namespace pv::cache;
using namespace pv::cache::testing;

namespace {

parse::FileExtraction sample() {
    parse::FileExtraction fx;
    fx.file_path = "app/utils.py";
    fx.language = "python";
    fx.loc = 12;
    fx.has_main_guard = true;
    fx.module_docstring = "Helpers.";
    parse::RawDefinition d;
    d.kind = "function";
    d.name = "is_valid";
    d.qualname = "is_valid";
    d.span = core::Span{3, 0, 5, 12};
    d.complexity = 2;
    d.signature = "def is_valid(x):";
    fx.definitions.push_back(d);
    fx.imports.push_back(parse::RawImport{"os.path", "join", "", 1, ""});
    fx.calls.push_back(parse::RawCall{"join", "os.path", 4, "is_valid"});
    fx.inherits.push_back(parse::RawInherit{"A", "Base", 7});
    return fx;
}

}  // namespace

TEST(CacheStore, ExtractionRoundTrip) {
    CacheDirScope scope;
    auto cache = ProjectCache::open("C:/code/demo");
    ASSERT_NE(cache, nullptr);
    EXPECT_EQ(cache->dir().rfind(scope.dir.generic_string(), 0), 0u);
    EXPECT_FALSE(cache->get_extraction("python", "abc").has_value());
    cache->put_extraction("app/utils.py", "python", "abc", sample());
    const auto back = cache->get_extraction("python", "abc");
    ASSERT_TRUE(back.has_value());
    EXPECT_EQ(extraction_to_json(*back), extraction_to_json(sample()));
    EXPECT_EQ(back->definitions[0].span.end_col, 12);
    EXPECT_EQ(back->calls[0].object, "os.path");

    const Stats s = cache->stats();
    EXPECT_EQ(s.files, 1);
    EXPECT_EQ(s.hits, 1);
    EXPECT_EQ(s.misses, 1);
    EXPECT_GT(s.bytes, 0);
}

TEST(CacheStore, LayoutsAndClear) {
    CacheDirScope scope;
    auto cache = ProjectCache::open("C:/code/demo");
    ASSERT_NE(cache, nullptr);
    cache->put_layout("2d:TB:project::1", nlohmann::json{{"a", 1}});
    EXPECT_EQ((*cache->get_layout("2d:TB:project::1"))["a"], 1);
    cache->clear();
    EXPECT_FALSE(cache->get_layout("2d:TB:project::1").has_value());
    EXPECT_EQ(cache->stats().files, 0);
    cache->put_layout("k", nlohmann::json::array());  // usable again after clear
    EXPECT_TRUE(cache->get_layout("k").has_value());
}

TEST(CacheStore, AnotherBuildWipesTheCache) {
    CacheDirScope scope;
    std::string dir;
    {
        auto cache = ProjectCache::open("C:/code/demo");
        ASSERT_NE(cache, nullptr);
        cache->put_extraction("a.py", "python", "h1", sample());
        dir = cache->dir();
    }
    {
        sqlite3* db = nullptr;
        ASSERT_EQ(sqlite3_open((dir + "/meta.db").c_str(), &db), SQLITE_OK);
        sqlite3_exec(db, "UPDATE project SET value = 'older-build' WHERE key = 'build'", nullptr, nullptr, nullptr);
        sqlite3_close(db);
    }
    auto reopened = ProjectCache::open("C:/code/demo");
    ASSERT_NE(reopened, nullptr);
    EXPECT_FALSE(reopened->get_extraction("python", "h1").has_value());
    EXPECT_EQ(reopened->stats().files, 0);
}

TEST(CacheStore, FolderPerRoot) {
    CacheDirScope scope;
    EXPECT_NE(cache_dir_for("C:/code/a"), cache_dir_for("C:/code/b"));
#ifdef _WIN32
    EXPECT_EQ(cache_dir_for("C:/Code/A"), cache_dir_for("c:/code/a"));
#endif
    EXPECT_FALSE(build_fingerprint().empty());
}
