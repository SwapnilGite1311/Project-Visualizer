#include <algorithm>
#include <cctype>
#include <map>
#include <set>

#include "pv/context/context.hpp"
#include "pv/grounding/grounding.hpp"
#include "pv/search/search.hpp"

namespace pv::grounding {
namespace {

constexpr std::size_t kMaxTerms = 12;
constexpr int kHitsPerTerm = 10;
constexpr std::size_t kMaxMatches = 8;
constexpr int kPackChars = 3000;

const std::set<std::string> kStopwords = {"the", "and",  "for",  "with", "how",  "what", "where", "does", "this", "that",
                                          "from", "into", "are", "was",  "when", "which", "who",  "why",  "can",  "use", "used"};

std::string lower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return s;
}

// "is_valid" -> {"is", "valid"}; "getUserName" -> {"get", "User", "Name"}
std::vector<std::string> parts_of(const std::string& word) {
    std::vector<std::string> parts;
    std::string current;
    for (std::size_t i = 0; i < word.size(); ++i) {
        const unsigned char c = static_cast<unsigned char>(word[i]);
        if (c == '_') {
            if (!current.empty()) parts.push_back(current);
            current.clear();
            continue;
        }
        if (std::isupper(c) && !current.empty() && std::islower(static_cast<unsigned char>(current.back()))) {
            parts.push_back(current);
            current.clear();
        }
        current.push_back(static_cast<char>(c));
    }
    if (!current.empty()) parts.push_back(current);
    return parts;
}

}  // namespace

std::vector<std::string> question_terms(const std::string& question) {
    std::vector<std::string> terms;
    std::set<std::string> seen;
    auto add = [&](const std::string& raw) {
        const std::string t = lower(raw);
        if (t.size() < 3 || kStopwords.count(t) || seen.count(t) || terms.size() >= kMaxTerms) return;
        seen.insert(t);
        terms.push_back(t);
    };
    std::string word;
    auto flush = [&] {
        if (word.empty()) return;
        add(word);
        const auto parts = parts_of(word);
        if (parts.size() > 1) {
            for (const std::string& p : parts) add(p);
        }
        word.clear();
    };
    for (const char ch : question) {
        const unsigned char c = static_cast<unsigned char>(ch);
        if (std::isalnum(c) || c == '_') word.push_back(ch);
        else flush();
    }
    flush();
    return terms;
}

nlohmann::json build_question_pack(const graph::Graph& g, const std::string& root, const std::string& question, const std::string& digest,
                                   int max_chars) {
    const std::vector<std::string> terms = question_terms(question);
    std::map<std::string, int> scores;
    for (const std::string& term : terms) {
        for (const search::SearchHit& hit : search::search_nodes(g, term, {}, kHitsPerTerm)) scores[hit.node_id] += hit.score;
    }
    std::vector<std::pair<std::string, int>> ranked(scores.begin(), scores.end());
    std::stable_sort(ranked.begin(), ranked.end(), [](const auto& a, const auto& b) { return a.second > b.second; });

    nlohmann::json matches = nlohmann::json::array();
    std::set<std::string> related;
    std::size_t used = digest.size() + question.size();
    for (const auto& [id, score] : ranked) {
        if (matches.size() >= kMaxMatches) break;
        nlohmann::json pack = context::build_context_pack(g, root, id, kPackChars);
        const std::size_t size = pack.dump().size();
        if (max_chars >= 0 && used + size > static_cast<std::size_t>(max_chars)) break;  // keep the facts within budget
        used += size;
        for (const auto& rid : pack["related_node_ids"]) related.insert(rid.get<std::string>());
        matches.push_back({{"node_id", id}, {"score", score}, {"pack", std::move(pack)}});
    }

    nlohmann::json out{{"kind", "question"},
                       {"question", question},
                       {"terms", terms},
                       {"digest", digest},
                       {"matches", matches},
                       {"related_node_ids", std::vector<std::string>(related.begin(), related.end())}};
    out["approx_tokens"] = static_cast<int>(out.dump().size() / 4);
    return out;
}

}  // namespace pv::grounding
