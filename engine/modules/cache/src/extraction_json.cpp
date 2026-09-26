#include "pv/cache/project_cache.hpp"

namespace pv::cache {

using nlohmann::json;

namespace {

json span_json(const core::Span& s) {
    return json::array({s.start_line, s.start_col, s.end_line, s.end_col});
}

core::Span span_from(const json& j) {
    core::Span s;
    if (j.is_array() && j.size() == 4) {
        s.start_line = j[0].get<int>();
        s.start_col = j[1].get<int>();
        s.end_line = j[2].get<int>();
        s.end_col = j[3].get<int>();
    }
    return s;
}

}  // namespace

// Compact arrays instead of objects: the cache holds one entry per file of every opened project.
json extraction_to_json(const parse::FileExtraction& fx) {
    json defs = json::array();
    for (const auto& d : fx.definitions) {
        defs.push_back(json::array({d.kind, d.name, d.qualname, d.parent_qualname, d.parent_is_class, span_json(d.span),
                                    d.complexity, d.signature, d.docstring}));
    }
    json imports = json::array();
    for (const auto& i : fx.imports) imports.push_back(json::array({i.module, i.name, i.alias, i.line, i.scope_qualname}));
    json calls = json::array();
    for (const auto& c : fx.calls) calls.push_back(json::array({c.name, c.object, c.line, c.caller_qualname}));
    json inherits = json::array();
    for (const auto& h : fx.inherits) inherits.push_back(json::array({h.class_qualname, h.base, h.line}));
    return json{{"v", 1},
                {"file_path", fx.file_path},
                {"language", fx.language},
                {"loc", fx.loc},
                {"syntax_errors", fx.has_syntax_errors},
                {"main_guard", fx.has_main_guard},
                {"doc", fx.module_docstring},
                {"defs", defs},
                {"imports", imports},
                {"calls", calls},
                {"inherits", inherits}};
}

parse::FileExtraction extraction_from_json(const json& j) {
    parse::FileExtraction fx;
    fx.file_path = j.value("file_path", "");
    fx.language = j.value("language", "");
    fx.loc = j.value("loc", 0);
    fx.has_syntax_errors = j.value("syntax_errors", false);
    fx.has_main_guard = j.value("main_guard", false);
    fx.module_docstring = j.value("doc", "");
    for (const auto& d : j.at("defs")) {
        parse::RawDefinition def;
        def.kind = d[0].get<std::string>();
        def.name = d[1].get<std::string>();
        def.qualname = d[2].get<std::string>();
        def.parent_qualname = d[3].get<std::string>();
        def.parent_is_class = d[4].get<bool>();
        def.span = span_from(d[5]);
        def.complexity = d[6].get<int>();
        def.signature = d[7].get<std::string>();
        def.docstring = d[8].get<std::string>();
        fx.definitions.push_back(std::move(def));
    }
    for (const auto& i : j.at("imports")) {
        fx.imports.push_back(parse::RawImport{i[0].get<std::string>(), i[1].get<std::string>(), i[2].get<std::string>(),
                                              i[3].get<int>(), i[4].get<std::string>()});
    }
    for (const auto& c : j.at("calls")) {
        fx.calls.push_back(parse::RawCall{c[0].get<std::string>(), c[1].get<std::string>(), c[2].get<int>(), c[3].get<std::string>()});
    }
    for (const auto& h : j.at("inherits")) {
        fx.inherits.push_back(parse::RawInherit{h[0].get<std::string>(), h[1].get<std::string>(), h[2].get<int>()});
    }
    return fx;
}

}  // namespace pv::cache
