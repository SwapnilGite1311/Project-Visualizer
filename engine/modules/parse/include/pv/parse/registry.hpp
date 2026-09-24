#pragma once
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "pv/parse/adapter.hpp"

namespace pv::parse {

class AdapterRegistry {
public:
    void add(std::unique_ptr<LanguageAdapter> adapter);  // duplicate id or claimed extension -> PvError(err::Conflict)
    const LanguageAdapter* for_extension(const std::string& extension) const; // case-insensitive; nullptr if none
    const LanguageAdapter* by_id(const std::string& id) const;
    std::vector<const LanguageAdapter*> all() const;      // sorted by id
    std::vector<std::string> all_extensions() const;      // sorted, lower-case
private:
    std::vector<std::unique_ptr<LanguageAdapter>> adapters_;
    std::map<std::string, const LanguageAdapter*> by_extension_;
};

}  // namespace pv::parse
