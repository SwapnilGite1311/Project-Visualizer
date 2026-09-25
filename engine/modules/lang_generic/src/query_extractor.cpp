#include "pv/lang_generic/query_extractor.hpp"

#include <algorithm>
#include <map>
#include <set>
#include <unordered_map>

#include "pv/core/text.hpp"
#include "pv/parse/query.hpp"
#include "pv/parse/ts.hpp"

namespace pv::lang_generic {

std::string strip_quotes(const std::string& text) {
    if (text.size() >= 2) {
        const char a = text.front();
        const char b = text.back();
        if ((a == '"' && b == '"') || (a == '\'' && b == '\'') || (a == '`' && b == '`') || (a == '<' && b == '>')) {
            return text.substr(1, text.size() - 2);
        }
    }
    return text;
}

namespace {

struct Def {
    uint32_t start = 0, end = 0;
    std::string kind_word, name, qualname, kind;
    TSNode node{};
};

int line_of(TSNode n) { return static_cast<int>(ts_node_start_point(n).row) + 1; }

std::string first_line(const std::string& text, std::size_t max_len) {
    const std::size_t nl = text.find('\n');
    std::string line = core::trim(nl == std::string::npos ? text : text.substr(0, nl));
    if (line.size() > max_len) line.resize(max_len);
    return line;
}

class Extractor {
public:
    Extractor(const QuerySpec& spec, const std::string& source, TSNode root) : spec_(spec), source_(source), root_(root) {}

    void definitions(parse::FileExtraction& fx) {
        const parse::TsQuery query(spec_.language, spec_.definitions_query);
        for (const parse::Match& m : query.run(root_)) {
            const parse::Capture* def = nullptr;
            for (const parse::Capture& c : m.captures) {
                if (c.name.rfind("definition.", 0) == 0) def = &c;
            }
            const parse::Capture* name = m.find("name");
            if (!def || !name) continue;
            Def d;
            d.start = ts_node_start_byte(def->node);
            d.end = ts_node_end_byte(def->node);
            d.kind_word = def->name.substr(std::string("definition.").size());
            d.name = parse::node_text(name->node, source_);
            d.node = def->node;
            name_starts_.push_back(ts_node_start_byte(name->node));
            defs_.push_back(d);
        }
        // Outer definitions before inner ones; indices keep each name node tied to its definition.
        std::vector<std::size_t> order(defs_.size());
        for (std::size_t i = 0; i < order.size(); ++i) order[i] = i;
        std::sort(order.begin(), order.end(), [&](std::size_t a, std::size_t b) {
            if (defs_[a].start != defs_[b].start) return defs_[a].start < defs_[b].start;
            return defs_[a].end > defs_[b].end;
        });

        std::vector<std::size_t> stack;
        std::vector<Def> sorted;
        for (std::size_t idx : order) {
            Def d = defs_[idx];
            while (!stack.empty() && sorted[stack.back()].end <= d.start) stack.pop_back();
            const Def* parent = stack.empty() ? nullptr : &sorted[stack.back()];
            d.kind = (d.kind_word == "class" || d.kind_word == "interface") ? "class" : "function";
            d.qualname = unique(parent ? parent->qualname + "." + d.name : d.name);

            parse::RawDefinition raw;
            raw.kind = d.kind;
            raw.name = d.name;
            raw.qualname = d.qualname;
            raw.parent_qualname = parent ? parent->qualname : "";
            raw.parent_is_class = parent && parent->kind == "class";
            raw.span = parse::node_span(d.node);
            raw.signature = first_line(parse::node_text(d.node, source_), 200);
            fx.definitions.push_back(raw);
            name_to_qualname_[name_starts_[idx]] = d.qualname;
            def_ranges_.insert({d.start, d.end});
            sorted.push_back(d);
            stack.push_back(sorted.size() - 1);
        }
        defs_ = sorted;
        for (std::size_t i = 0; i < defs_.size(); ++i) fx.definitions[i].complexity = 1 + decisions(defs_[i].node);
    }

    void imports(parse::FileExtraction& fx) const {
        if (spec_.imports_query.empty()) return;
        const parse::TsQuery query(spec_.language, spec_.imports_query);
        for (const parse::Match& m : query.run(root_)) {
            const parse::Capture* module = m.find("import.module");
            if (!module || m.captures.empty()) continue;
            if (const parse::Capture* fn = m.find("import.require_fn")) {
                if (parse::node_text(fn->node, source_) != spec_.require_function) continue;
            }
            parse::RawImport imp;
            imp.module = strip_quotes(parse::node_text(module->node, source_));
            if (const parse::Capture* c = m.find("import.name")) imp.name = parse::node_text(c->node, source_);
            if (const parse::Capture* c = m.find("import.default")) {
                imp.alias = parse::node_text(c->node, source_);
                imp.name = "default";
            }
            if (const parse::Capture* c = m.find("import.namespace")) {
                imp.alias = parse::node_text(c->node, source_);
                imp.name = "";
            }
            if (const parse::Capture* c = m.find("import.alias")) imp.alias = parse::node_text(c->node, source_);
            if (m.find("import.wildcard")) imp.name = "*";
            imp.line = line_of(module->node);
            imp.scope_qualname = enclosing(ts_node_start_byte(m.captures.front().node));
            fx.imports.push_back(imp);
        }
    }

    void calls(parse::FileExtraction& fx) const {
        if (spec_.calls_query.empty()) return;
        const parse::TsQuery query(spec_.language, spec_.calls_query);
        for (const parse::Match& m : query.run(root_)) {
            const parse::Capture* name = m.find("call.name");
            if (!name) continue;
            parse::RawCall call;
            call.name = parse::node_text(name->node, source_);
            if (const parse::Capture* obj = m.find("call.object")) {
                call.object = parse::node_text(obj->node, source_);
                if (call.object.size() > 200) call.object.resize(200);
            }
            call.line = line_of(name->node);
            call.caller_qualname = enclosing(ts_node_start_byte(name->node));
            fx.calls.push_back(call);
        }
    }

    void inherits(parse::FileExtraction& fx) const {
        if (spec_.inherits_query.empty()) return;
        const parse::TsQuery query(spec_.language, spec_.inherits_query);
        for (const parse::Match& m : query.run(root_)) {
            const parse::Capture* cls = m.find("inherit.class");
            const parse::Capture* base = m.find("inherit.base");
            if (!cls || !base) continue;
            const auto it = name_to_qualname_.find(ts_node_start_byte(cls->node));
            if (it == name_to_qualname_.end()) continue;
            fx.inherits.push_back({it->second, parse::node_text(base->node, source_), line_of(base->node)});
        }
    }

private:
    std::string unique(const std::string& base) {
        const int n = ++seen_[base];
        return n == 1 ? base : base + "~" + std::to_string(n);
    }

    // The innermost definition containing the byte, or "" (module level).
    std::string enclosing(uint32_t byte) const {
        const Def* best = nullptr;
        for (const Def& d : defs_) {
            if (byte >= d.start && byte < d.end && (!best || d.end - d.start < best->end - best->start)) best = &d;
        }
        return best ? best->qualname : "";
    }

    // Decision nodes inside a definition, not counting nested definitions.
    int decisions(TSNode n) const {
        int count = 0;
        for (TSNode c : parse::named_children(n)) {
            if (def_ranges_.count({ts_node_start_byte(c), ts_node_end_byte(c)})) continue;
            const std::string type = parse::node_type(c);
            const auto& types = spec_.decision_node_types;
            if (std::find(types.begin(), types.end(), type) != types.end()) ++count;
            count += decisions(c);
        }
        return count;
    }

    const QuerySpec& spec_;
    const std::string& source_;
    TSNode root_;
    std::vector<Def> defs_;
    std::vector<uint32_t> name_starts_;
    std::set<std::pair<uint32_t, uint32_t>> def_ranges_;
    std::unordered_map<uint32_t, std::string> name_to_qualname_;
    std::map<std::string, int> seen_;
};

}  // namespace

parse::FileExtraction extract_with_queries(const QuerySpec& spec, const std::string& rel_path, const std::string& source) {
    parse::FileExtraction fx;
    fx.file_path = rel_path;
    fx.language = spec.language_id;
    fx.loc = core::count_lines(source);
    const parse::TsParser parser(spec.language);
    const parse::TsTree tree = parser.parse(source);
    fx.has_syntax_errors = tree.has_error();
    Extractor ex(spec, source, tree.root());
    ex.definitions(fx);
    ex.imports(fx);
    ex.calls(fx);
    ex.inherits(fx);
    return fx;
}

}  // namespace pv::lang_generic
