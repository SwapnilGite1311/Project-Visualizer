#pragma once
#include <map>
#include <string>

#include <nlohmann/json.hpp>

#include "pv/graph/graph.hpp"
#include "pv/health/health.hpp"

namespace pv::change {

// A planned change: kind is modify_body, change_signature, rename, delete or move.
struct Change {
    std::string kind, node_id, new_name, new_parent_id;
};

Change change_from_json(const nlohmann::json& j);  // PvError(InvalidParams) for an unknown kind or a missing node_id
nlohmann::json change_to_json(const Change& c);

// How much riskier this kind of change is than an average one: modify_body 0.6, move 0.8, rename and change_signature 1.0, delete 1.3.
double type_multiplier(const std::string& kind);

// {change, affected, risk: {score, level, factors}, breakdown: {static_score, type_multiplier, runtime_bonus}}:
// impact.analyze's static risk, weighted by the kind of change, plus runtime evidence (affected parts that ran, unhealthy parts).
nlohmann::json preview(const graph::Graph& g, const Change& c, const std::map<std::string, health::HealthInfo>& health);

}  // namespace pv::change
