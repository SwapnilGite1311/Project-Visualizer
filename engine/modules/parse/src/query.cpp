#include "pv/parse/query.hpp"

#include "pv/core/error.hpp"

namespace pv::parse {

const Capture* Match::find(const std::string& name) const {
    for (const Capture& c : captures) {
        if (c.name == name) return &c;
    }
    return nullptr;
}

TsQuery::TsQuery(const TSLanguage* language, const std::string& source) {
    uint32_t error_offset = 0;
    TSQueryError error_type = TSQueryErrorNone;
    query_ = ts_query_new(language, source.c_str(), static_cast<uint32_t>(source.size()), &error_offset, &error_type);
    if (!query_) {
        throw core::PvError(core::err::Internal, "query error at offset " + std::to_string(error_offset));
    }
}

TsQuery::~TsQuery() {
    if (query_) ts_query_delete(query_);
}

std::vector<Match> TsQuery::run(TSNode root) const {
    std::vector<Match> out;
    TSQueryCursor* cursor = ts_query_cursor_new();
    ts_query_cursor_exec(cursor, query_, root);
    TSQueryMatch match;
    while (ts_query_cursor_next_match(cursor, &match)) {
        Match m;
        m.pattern_index = match.pattern_index;
        for (uint16_t i = 0; i < match.capture_count; ++i) {
            uint32_t length = 0;
            const char* name = ts_query_capture_name_for_id(query_, match.captures[i].index, &length);
            m.captures.push_back(Capture{std::string(name, length), match.captures[i].node});
        }
        out.push_back(std::move(m));
    }
    ts_query_cursor_delete(cursor);
    return out;
}

}  // namespace pv::parse
