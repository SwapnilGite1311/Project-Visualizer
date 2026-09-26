#include "pv/builder/extraction_cache.hpp"

#include <atomic>
#include <cstdint>

namespace pv::builder {

namespace {
std::atomic<ExtractionCache*> g_cache{nullptr};
}

void set_extraction_cache(ExtractionCache* cache) {
    g_cache = cache;
}

ExtractionCache* extraction_cache() {
    return g_cache.load();
}

std::string content_hash(const std::string& bytes) {
    std::uint64_t h = 14695981039346656037ULL;
    for (const unsigned char c : bytes) {
        h ^= c;
        h *= 1099511628211ULL;
    }
    static const char* digits = "0123456789abcdef";
    std::string out(16, '0');
    for (int i = 15; i >= 0; --i) {
        out[static_cast<std::size_t>(i)] = digits[h & 0xF];
        h >>= 4;
    }
    return out;
}

}  // namespace pv::builder
