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

void to_json(Json& j, const Edge& e) {
    j = Json{{"id", e.id},
             {"kind", to_string(e.kind)},
             {"source_id", e.source_id},
             {"target_id", e.target_id},
             {"weight", e.weight},
             {"resolved", e.resolved}};
}

void from_json(const Json& j, Edge& e) {
    j.at("id").get_to(e.id);
    const std::string kind = j.at("kind").get<std::string>();
    const auto parsed_kind = edge_kind_from_string(kind);
    if (!parsed_kind) throw PvError(err::InvalidParams, "unknown edge kind: " + kind);
    e.kind = *parsed_kind;
    j.at("source_id").get_to(e.source_id);
    j.at("target_id").get_to(e.target_id);
    j.at("weight").get_to(e.weight);
    j.at("resolved").get_to(e.resolved);
}

}  // namespace pv::core
