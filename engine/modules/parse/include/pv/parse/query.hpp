#pragma once
#include <cstdint>
#include <string>
#include <vector>

#include <tree_sitter/api.h>

namespace pv::parse {

struct Capture { std::string name; TSNode node; };
struct Match {
    uint32_t pattern_index = 0;
    std::vector<Capture> captures;
    const Capture* find(const std::string& name) const;   // first capture with that name or nullptr
};
class TsQuery {
public:
    TsQuery(const TSLanguage* language, const std::string& source);  // error -> PvError(err::Internal, "query error at offset <n>")
    ~TsQuery();
    TsQuery(const TsQuery&) = delete;
    TsQuery& operator=(const TsQuery&) = delete;
    std::vector<Match> run(TSNode root) const;   // all matches, in document order
private:
    TSQuery* query_ = nullptr;
};

}  // namespace pv::parse
