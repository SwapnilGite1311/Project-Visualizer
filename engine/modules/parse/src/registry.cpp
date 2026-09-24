#include "pv/parse/registry.hpp"

#include <algorithm>

#include "pv/core/error.hpp"
#include "pv/core/text.hpp"

namespace pv::parse {

void AdapterRegistry::add(std::unique_ptr<LanguageAdapter> adapter) {
    if (by_id(adapter->id())) throw core::PvError(core::err::Conflict, "duplicate language: " + adapter->id());
    for (const std::string& ext : adapter->extensions()) {
        if (by_extension_.count(core::to_lower(ext))) {
            throw core::PvError(core::err::Conflict, "extension already claimed: " + ext);
        }
    }
    for (const std::string& ext : adapter->extensions()) by_extension_[core::to_lower(ext)] = adapter.get();
    adapters_.push_back(std::move(adapter));
}

const LanguageAdapter* AdapterRegistry::for_extension(const std::string& extension) const {
    auto it = by_extension_.find(core::to_lower(extension));
    return it == by_extension_.end() ? nullptr : it->second;
}

const LanguageAdapter* AdapterRegistry::by_id(const std::string& id) const {
    for (const auto& adapter : adapters_) {
        if (adapter->id() == id) return adapter.get();
    }
    return nullptr;
}

std::vector<const LanguageAdapter*> AdapterRegistry::all() const {
    std::vector<const LanguageAdapter*> out;
    for (const auto& adapter : adapters_) out.push_back(adapter.get());
    std::sort(out.begin(), out.end(),
              [](const LanguageAdapter* a, const LanguageAdapter* b) { return a->id() < b->id(); });
    return out;
}

std::vector<std::string> AdapterRegistry::all_extensions() const {
    std::vector<std::string> out;
    for (const auto& [ext, adapter] : by_extension_) out.push_back(ext);
    return out;
}

}  // namespace pv::parse
