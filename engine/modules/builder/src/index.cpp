#include "pv/builder/builder.hpp"
#include "pv/core/ids.hpp"

namespace pv::builder {

parse::ProjectIndex build_index(const std::vector<parse::FileExtraction>& fxs, const parse::AdapterRegistry& adapters) {
    parse::ProjectIndex index;
    for (const parse::FileExtraction& fx : fxs) {
        const parse::LanguageAdapter* adapter = adapters.by_id(fx.language);
        if (!adapter) continue;
        for (const std::string& name : adapter->module_names(fx.file_path)) index.add_module_name(name, fx.file_path);
        for (const parse::RawDefinition& def : fx.definitions) {
            index.add_symbol(fx.file_path, def.qualname,
                             core::make_node_id(definition_kind(def), fx.file_path, def.qualname));
        }
    }
    return index;
}

}  // namespace pv::builder
