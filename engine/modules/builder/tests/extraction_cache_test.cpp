#include <gtest/gtest.h>

#include <filesystem>
#include <fstream>
#include <map>
#include <mutex>
#include <random>

#include "fake_adapter.hpp"
#include "pv/builder/builder.hpp"
#include "pv/builder/extraction_cache.hpp"

using namespace pv;
using namespace pv::builder;

namespace {

class CountingCache : public ExtractionCache {
public:
    std::optional<parse::FileExtraction> lookup(const std::string&, const std::string& language,
                                                const std::string& hash) override {
        std::lock_guard<std::mutex> lock(m);
        ++lookups;
        const auto it = items.find(language + ":" + hash);
        if (it == items.end()) return std::nullopt;
        ++hits;
        return it->second;
    }
    void store(const std::string&, const std::string& language, const std::string& hash,
               const parse::FileExtraction& fx) override {
        std::lock_guard<std::mutex> lock(m);
        ++stores;
        items[language + ":" + hash] = fx;
    }
    std::mutex m;
    std::map<std::string, parse::FileExtraction> items;
    int lookups = 0, hits = 0, stores = 0;
};

// Sets the global cache for one test and always clears it again.
struct CacheScope {
    explicit CacheScope(ExtractionCache* c) { set_extraction_cache(c); }
    ~CacheScope() { set_extraction_cache(nullptr); }
};

}  // namespace

TEST(BuilderExtractionCache, ContentHashIsStable) {
    EXPECT_EQ(content_hash(""), "cbf29ce484222325");
    EXPECT_EQ(content_hash("a"), content_hash("a"));
    EXPECT_NE(content_hash("a"), content_hash("b"));
    EXPECT_EQ(content_hash("hello").size(), 16u);
}

TEST(BuilderExtractionCache, SecondRunOnlyHits) {
    std::random_device rd;
    const auto root = std::filesystem::temp_directory_path() / ("pv_builder_cache_" + std::to_string(rd()));
    std::filesystem::create_directories(root);
    std::vector<fs::DiscoveredFile> files;
    for (int i = 0; i < 6; ++i) {
        const std::string rel = "f" + std::to_string(i) + ".fk";
        // Files 0 and 1 have the same content: one cache entry, but each keeps its own path.
        std::ofstream(root / rel, std::ios::binary) << (i <= 1 ? std::string("same\n") : std::string(i, 'x') + "\n");
        files.push_back(fs::DiscoveredFile{rel, (root / rel).generic_string(), 4});
    }
    parse::AdapterRegistry adapters;
    adapters.add(std::make_unique<pv::builder::testing::FakeAdapter>());

    CountingCache cache;
    CacheScope scope(&cache);
    std::vector<std::string> errors;
    const auto first = extract_all(adapters, files, nullptr, 3, errors);
    EXPECT_EQ(cache.lookups, 6);
    EXPECT_GE(cache.stores, 5);  // the two identical files may race; at least one store per distinct content

    cache.lookups = cache.hits = cache.stores = 0;
    const auto second = extract_all(adapters, files, nullptr, 3, errors);
    EXPECT_EQ(cache.lookups, 6);
    EXPECT_EQ(cache.hits, 6);
    EXPECT_EQ(cache.stores, 0);
    ASSERT_EQ(second.size(), first.size());
    for (std::size_t i = 0; i < first.size(); ++i) {
        EXPECT_EQ(second[i].file_path, files[i].rel_path);
        EXPECT_EQ(second[i].loc, first[i].loc);
    }
    EXPECT_TRUE(errors.empty());
    std::filesystem::remove_all(root);
}

TEST(BuilderExtractionCache, OffByDefault) {
    EXPECT_EQ(extraction_cache(), nullptr);
}
