#include <cctype>
#include <cstdlib>
#include <map>
#include <memory>
#include <mutex>
#include <vector>

#include "pv/builder/extraction_cache.hpp"
#include "pv/cache/project_cache.hpp"
#include "pv/core/error.hpp"
#include "pv/core/paths.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

namespace {

using pv::rpc::Json;

std::string comparable(std::string path) {
    path = pv::core::normalize_path(path);
#ifdef _WIN32
    for (char& c : path) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
#endif
    return path;
}

// Finds the project a file belongs to and forwards to that project's cache.
class ProjectCaches : public pv::builder::ExtractionCache {
public:
    explicit ProjectCaches(pv::session::ProjectManager& pm) : pm_(pm) {}

    std::optional<pv::parse::FileExtraction> lookup(const std::string& abs_path, const std::string& language,
                                                    const std::string& content_hash) override {
        pv::cache::ProjectCache* cache = for_file(abs_path);
        return cache ? cache->get_extraction(language, content_hash) : std::nullopt;
    }

    void store(const std::string& abs_path, const std::string& language, const std::string& content_hash,
               const pv::parse::FileExtraction& fx) override {
        if (pv::cache::ProjectCache* cache = for_file(abs_path)) cache->put_extraction(fx.file_path, language, content_hash, fx);
    }

    pv::cache::ProjectCache* for_root(const std::string& root) { return pv::cache::shared_cache(root); }

private:
    pv::cache::ProjectCache* for_file(const std::string& abs_path) {
        const std::string file = comparable(abs_path);
        std::string best;
        for (const std::string& id : pm_.ids()) {
            std::shared_ptr<pv::session::Project> project;
            try {
                project = pm_.get(id);
            } catch (const pv::core::PvError&) {
                continue;
            }
            const std::string root = project->root_path();
            const std::string r = comparable(root);
            if (!r.empty() && file.size() > r.size() && file.compare(0, r.size(), r) == 0 && file[r.size()] == '/' &&
                r.size() > comparable(best).size()) {
                best = root;
            }
        }
        return best.empty() ? nullptr : for_root(best);
    }

    pv::session::ProjectManager& pm_;
};

bool cache_disabled() {
#ifdef _WIN32
    char* value = nullptr;
    std::size_t len = 0;
    if (_dupenv_s(&value, &len, "PV_CACHE") != 0 || !value) return false;
    const bool off = std::string(value) == "off";
    std::free(value);
    return off;
#else
    const char* v = std::getenv("PV_CACHE");
    return v && std::string(v) == "off";
#endif
}

}  // namespace

void pv_register_cache(pv::session::Registry& reg) {
    // Instances live until the process ends: the builder keeps a raw pointer to the current one. (The engine registers
    // once; tests register several registries in one process.)
    static std::mutex instances_mutex;
    static std::vector<std::unique_ptr<ProjectCaches>> instances;
    ProjectCaches* caches = nullptr;
    {
        std::lock_guard<std::mutex> lock(instances_mutex);
        instances.push_back(std::make_unique<ProjectCaches>(reg.projects));
        caches = instances.back().get();
    }
    if (!cache_disabled()) pv::builder::set_extraction_cache(caches);

    auto cache_of = [&reg, caches](const Json& p) -> pv::cache::ProjectCache& {
        const auto project = reg.projects.get(pv::rpc::require_string(p, "project_id"));
        pv::cache::ProjectCache* cache = caches->for_root(project->root_path());
        if (!cache) throw pv::core::PvError(pv::core::err::Io, "the local cache cannot be opened");
        return *cache;
    };
    reg.methods.add("cache.status", [cache_of](const Json& p) {
        const pv::cache::Stats s = cache_of(p).stats();
        return Json{{"dir", s.dir}, {"files", s.files}, {"hits", s.hits}, {"misses", s.misses}, {"bytes", s.bytes}};
    });
    reg.methods.add("cache.clear", [cache_of](const Json& p) {
        cache_of(p).clear();
        return Json{{"ok", true}};
    });
}
