#include <algorithm>
#include <cmath>

#include "pv/change/change.hpp"
#include "pv/core/error.hpp"
#include "pv/impact/impact.hpp"

namespace pv::change {
namespace {

constexpr int kMaxDepth = 5;

// Same bands as impact.analyze.
std::string level_for(int score) {
    if (score < 20) return "low";
    if (score < 45) return "medium";
    if (score < 70) return "high";
    return "critical";
}

bool unhealthy(const std::map<std::string, health::HealthInfo>& health, const std::string& id) {
    const auto it = health.find(id);
    if (it == health.end()) return false;
    const core::Health s = it->second.state;
    return s == core::Health::Warning || s == core::Health::Stalled || s == core::Health::Error;
}

std::string format_multiplier(double m) {
    char buf[16];
    std::snprintf(buf, sizeof buf, "%.1f", m);
    return buf;
}

}  // namespace

double type_multiplier(const std::string& kind) {
    if (kind == "modify_body") return 0.6;
    if (kind == "move") return 0.8;
    if (kind == "delete") return 1.3;
    if (kind == "rename" || kind == "change_signature") return 1.0;
    throw core::PvError(core::err::InvalidParams, "unknown change kind: " + kind);
}

Change change_from_json(const nlohmann::json& j) {
    if (!j.is_object()) throw core::PvError(core::err::InvalidParams, "change must be an object");
    Change c;
    c.kind = j.value("kind", "");
    c.node_id = j.value("node_id", "");
    c.new_name = j.value("new_name", "");
    c.new_parent_id = j.value("new_parent_id", "");
    type_multiplier(c.kind);  // validates the kind
    if (c.node_id.empty()) throw core::PvError(core::err::InvalidParams, "change.node_id is required");
    return c;
}

nlohmann::json change_to_json(const Change& c) {
    nlohmann::json j{{"kind", c.kind}, {"node_id", c.node_id}};
    if (!c.new_name.empty()) j["new_name"] = c.new_name;
    if (!c.new_parent_id.empty()) j["new_parent_id"] = c.new_parent_id;
    return j;
}

nlohmann::json preview(const graph::Graph& g, const Change& c, const std::map<std::string, health::HealthInfo>& health) {
    const impact::ImpactResult r = impact::analyze_impact(g, c.node_id, kMaxDepth);
    const double mult = type_multiplier(c.kind);
    const int static_score = r.risk.score;

    int ran = 0;
    bool unstable = unhealthy(health, c.node_id);
    for (const impact::AffectedNode& a : r.affected) {
        const auto it = health.find(a.node_id);
        if (it != health.end() && it->second.calls > 0) ++ran;
        if (unhealthy(health, a.node_id)) unstable = true;
    }
    const int runtime_bonus = std::min(20, 2 * ran) + (unstable ? 10 : 0);
    const int score = std::min(100, static_cast<int>(std::lround(static_score * mult)) + runtime_bonus);

    std::vector<std::string> factors = r.risk.factors;
    factors.push_back("change type: " + c.kind + " (x" + format_multiplier(mult) + ")");
    if (ran > 0) factors.push_back(std::to_string(ran) + " affected parts ran recently");
    if (unstable) factors.push_back("some affected parts are currently unhealthy");

    const nlohmann::json impact_json = impact::to_json(r);
    return {{"change", change_to_json(c)},
            {"affected", impact_json["affected"]},
            {"risk", {{"score", score}, {"level", level_for(score)}, {"factors", factors}}},
            {"breakdown", {{"static_score", static_score}, {"type_multiplier", mult}, {"runtime_bonus", runtime_bonus}}}};
}

}  // namespace pv::change
