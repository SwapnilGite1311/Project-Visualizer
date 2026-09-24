#include <algorithm>

#include "pv/builder/builder.hpp"
#include "pv/core/paths.hpp"

namespace pv::builder {

BuildResult build_project(const parse::AdapterRegistry& adapters, const std::string& root_path,
                          const std::vector<fs::DiscoveredFile>& files,
                          const std::function<void(int done, int total)>& on_progress,
                          const std::function<void(const std::string& phase)>& on_phase, int threads) {
    BuildResult result;
    if (on_phase) on_phase("parsing");

    std::vector<std::string> rel_paths;
    rel_paths.reserve(files.size());
    for (const fs::DiscoveredFile& f : files) rel_paths.push_back(f.rel_path);
    auto language_of = [&adapters](const std::string& rel) {
        const parse::LanguageAdapter* adapter = adapters.for_extension(core::path_extension(rel));
        return adapter ? adapter->id() : std::string();
    };
    add_structure_nodes(result.graph, root_path, rel_paths, language_of);

    const std::vector<parse::FileExtraction> fxs = extract_all(adapters, files, on_progress, threads, result.errors);
    result.files_failed = static_cast<int>(result.errors.size());
    result.files_parsed = static_cast<int>(files.size()) - result.files_failed;

    if (on_phase) on_phase("linking");
    for (const parse::FileExtraction& fx : fxs) {
        if (const parse::LanguageAdapter* adapter = adapters.by_id(fx.language)) {
            add_definition_nodes(result.graph, fx, *adapter);
        }
    }
    const parse::ProjectIndex index = build_index(fxs, adapters);
    for (const parse::FileExtraction& fx : fxs) {
        const parse::LanguageAdapter* adapter = adapters.by_id(fx.language);
        if (!adapter) continue;
        const FileBindings bindings = link_imports(result.graph, fx, *adapter, index);
        link_calls(result.graph, fx, *adapter, index, bindings);
        link_inherits(result.graph, fx, index, bindings);
    }

    compute_metrics(result.graph);

    for (const parse::FileExtraction& fx : fxs) {
        if (fx.has_main_guard) result.main_guard_files.push_back(fx.file_path);
        if (fx.has_syntax_errors) result.syntax_error_files.push_back(fx.file_path);
    }
    std::sort(result.main_guard_files.begin(), result.main_guard_files.end());
    std::sort(result.syntax_error_files.begin(), result.syntax_error_files.end());
    return result;
}

}  // namespace pv::builder
