#include "pv/core/json.hpp"

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

}  // namespace pv::core
