#pragma once
#include <optional>
#include <string>

#include "pv/parse/raw.hpp"

namespace pv::builder {

// Optional store of raw extractions keyed by file content, so unchanged files are not parsed again.
// The builder only offers this hook; the local cache module (engine/modules/cache) provides the implementation.
class ExtractionCache {
public:
    virtual ~ExtractionCache() = default;
    virtual std::optional<parse::FileExtraction> lookup(const std::string& abs_path, const std::string& language,
                                                        const std::string& content_hash) = 0;
    virtual void store(const std::string& abs_path, const std::string& language, const std::string& content_hash,
                       const parse::FileExtraction& fx) = 0;
};

void set_extraction_cache(ExtractionCache* cache);  // nullptr = off (the default)
ExtractionCache* extraction_cache();

std::string content_hash(const std::string& bytes);  // 64-bit FNV-1a as 16 lowercase hex characters

}  // namespace pv::builder
