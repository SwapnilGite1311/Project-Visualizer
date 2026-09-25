#pragma once
#include <map>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "pv/errmap/store.hpp"
#include "pv/graph/graph.hpp"
#include "pv/health/health.hpp"

namespace pv::grounding {

// Everything the AI may know, built deterministically from the graph (R11): the AI never sees the project any other way.

// A compact overview: project size and languages, entry points, what each package holds, external libraries (whole lines, <= max_chars).
std::string build_digest(const graph::Graph& g, const std::vector<std::string>& main_guard_files, int max_chars);

// Facts for "explain this error": the error, the origin element's context pack, code around up to 5 project frames, their health.
nlohmann::json build_error_pack(const graph::Graph& g, const std::string& root, const errmap::ErrorRecord& e,
                                const std::map<std::string, health::HealthInfo>& health);

// Search terms from a question: words of 3+ letters without stopwords, plus the parts of snake_case/camelCase words (max 12).
std::vector<std::string> question_terms(const std::string& question);

// Facts for a question: the digest and the best-matching elements with their context packs (total size <= max_chars).
nlohmann::json build_question_pack(const graph::Graph& g, const std::string& root, const std::string& question, const std::string& digest,
                                   int max_chars);

// {valid, invalid}: which cited ids exist in the graph.
nlohmann::json check_citations(const graph::Graph& g, const std::vector<std::string>& ids);

}  // namespace pv::grounding
