#include <algorithm>
#include <atomic>
#include <mutex>
#include <thread>

#include "pv/builder/builder.hpp"
#include "pv/builder/extraction_cache.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"

namespace pv::builder {

std::vector<parse::FileExtraction> extract_all(const parse::AdapterRegistry& adapters,
                                               const std::vector<fs::DiscoveredFile>& files,
                                               const std::function<void(int, int)>& on_progress, int threads,
                                               std::vector<std::string>& errors) {
    const std::size_t n = files.size();
    std::vector<parse::FileExtraction> result(n);
    if (n == 0) return result;
    unsigned worker_count = threads > 0 ? static_cast<unsigned>(threads)
                                        : std::clamp(std::thread::hardware_concurrency(), 1u, 8u);
    worker_count = std::min<unsigned>(worker_count, static_cast<unsigned>(n));

    std::atomic<std::size_t> next{0};
    std::atomic<int> done{0};
    std::mutex m;
    auto worker = [&]() {
        while (true) {
            const std::size_t i = next++;
            if (i >= n) break;
            const std::string& rel = files[i].rel_path;
            const parse::LanguageAdapter* adapter = adapters.for_extension(core::path_extension(rel));
            if (adapter) {
                try {
                    const std::string text = core::read_file_text(files[i].abs_path);
                    ExtractionCache* cache = extraction_cache();
                    if (cache) {
                        // Same content + same language = same extraction; only the path can differ (e.g. empty files).
                        const std::string hash = content_hash(text);
                        if (auto hit = cache->lookup(files[i].abs_path, adapter->id(), hash)) {
                            result[i] = std::move(*hit);
                            result[i].file_path = rel;
                        } else {
                            result[i] = adapter->extract(rel, text);
                            cache->store(files[i].abs_path, adapter->id(), hash, result[i]);
                        }
                    } else {
                        result[i] = adapter->extract(rel, text);
                    }
                } catch (const std::exception& e) {
                    result[i].file_path = rel;
                    result[i].language = adapter->id();
                    std::lock_guard<std::mutex> lock(m);
                    errors.push_back(rel + ": " + e.what());
                }
            }
            const int d = ++done;
            std::lock_guard<std::mutex> lock(m);
            if (on_progress) on_progress(d, static_cast<int>(n));
        }
    };

    std::vector<std::thread> pool;
    for (unsigned t = 0; t < worker_count; ++t) pool.emplace_back(worker);
    for (std::thread& t : pool) t.join();
    std::sort(errors.begin(), errors.end());
    return result;
}

}  // namespace pv::builder
