#include "pv/core/json.hpp"

#include "pv/core/error.hpp"

namespace pv::core {

void to_json(Json& j, const Span& s) {
    j = Json{{"start_line", s.start_line}, {"start_col", s.start_col}, {"end_line", s.end_line}, {"end_col", s.end_col}};
}

void from_json(const Json& j, Span& s) {
    j.at("start_line").get_to(s.start_line);
    j.at("start_col").get_to(s.start_col);
    j.at("end_line").get_to(s.end_line);
    j.at("end_col").get_to(s.end_col);
}

void to_json(Json& j, const Metrics& m) {
    j = Json{{"loc", m.loc}, {"complexity", m.complexity}, {"fan_in", m.fan_in}, {"fan_out", m.fan_out}};
}

void from_json(const Json& j, Metrics& m) {
    j.at("loc").get_to(m.loc);
    j.at("complexity").get_to(m.complexity);
    j.at("fan_in").get_to(m.fan_in);
    j.at("fan_out").get_to(m.fan_out);
}

void to_json(Json& j, const Node& n) {
    j = Json{{"id", n.id},
             {"kind", to_string(n.kind)},
             {"name", n.name},
             {"qualified_name", n.qualified_name},
             {"file_path", n.file_path},
             {"language", n.language},
             {"span", n.span},
             {"level", n.level},
             {"parent_id", n.parent_id},
             {"metrics", n.metrics},
             {"health", to_string(n.health)}};
}

void from_json(const Json& j, Node& n) {
    j.at("id").get_to(n.id);
    const std::string kind = j.at("kind").get<std::string>();
    const auto parsed_kind = node_kind_from_string(kind);
    if (!parsed_kind) throw PvError(err::InvalidParams, "unknown node kind: " + kind);
    n.kind = *parsed_kind;
    j.at("name").get_to(n.name);
    j.at("qualified_name").get_to(n.qualified_name);
    j.at("file_path").get_to(n.file_path);
    j.at("language").get_to(n.language);
    j.at("span").get_to(n.span);
    j.at("level").get_to(n.level);
    j.at("parent_id").get_to(n.parent_id);
    j.at("metrics").get_to(n.metrics);
    const std::string health = j.at("health").get<std::string>();
    const auto parsed_health = health_from_string(health);
    if (!parsed_health) throw PvError(err::InvalidParams, "unknown health: " + health);
    n.health = *parsed_health;
}

}  // namespace pv::core
