#include "pv/motion/body.hpp"

#include <algorithm>
#include <map>
#include <set>

#include "pv/core/error.hpp"
#include "pv/lang_python/internal.hpp"
#include "pv/parse/ts.hpp"

namespace pv::motion {
namespace {

const std::map<std::string, std::string> kKinds{
    {"if_statement", "if"},           {"elif_clause", "elif"},           {"else_clause", "else"},
    {"for_statement", "for"},         {"while_statement", "while"},      {"try_statement", "try"},
    {"except_clause", "except"},      {"except_group_clause", "except"}, {"finally_clause", "finally"},
    {"with_statement", "with"},       {"match_statement", "match"},      {"case_clause", "case"},
    {"return_statement", "return"},   {"raise_statement", "raise"},      {"break_statement", "break"},
    {"continue_statement", "continue"}, {"pass_statement", "pass"},      {"function_definition", "def"},
    {"class_definition", "class"}};

const std::set<std::string> kCompound{"if_statement",   "for_statement",   "while_statement", "try_statement",
                                      "with_statement", "match_statement", "case_clause"};
const std::set<std::string> kClauses{"elif_clause", "else_clause", "except_clause", "except_group_clause",
                                     "finally_clause"};

int line_of(TSNode n) { return static_cast<int>(ts_node_start_point(n).row) + 1; }
int end_line_of(TSNode n) { return static_cast<int>(ts_node_end_point(n).row) + 1; }

bool is_definition(const std::string& type) {
    return type == "function_definition" || type == "class_definition" || type == "decorated_definition";
}

TSNode last_block(TSNode n) {
    TSNode found{};
    for (TSNode c : parse::named_children(n)) {
        if (parse::node_type(c) == "block") found = c;
    }
    return found;
}

class Walker {
public:
    explicit Walker(const std::string& source) : source_(source) {}

    void walk(TSNode body, int depth, const std::string& parent) {
        for (TSNode c : parse::named_children(body)) {
            const std::string type = parse::node_type(c);
            if (type == "comment") continue;
            const std::string id = emit(c, depth, parent);
            if (!kCompound.count(type)) continue;
            walk_block_of(c, depth + 1, id);
            for (TSNode k : parse::named_children(c)) {
                if (!kClauses.count(parse::node_type(k))) continue;
                const std::string clause_id = emit(k, depth, parent);
                walk_block_of(k, depth + 1, clause_id);
            }
        }
    }

    std::vector<Block> blocks;

private:
    void walk_block_of(TSNode n, int depth, const std::string& parent) {
        const TSNode block = last_block(n);
        if (!ts_node_is_null(block)) walk(block, depth, parent);
    }

    std::string emit(TSNode n, int depth, const std::string& parent) {
        std::string type = parse::node_type(n);
        TSNode definition = n;
        if (type == "decorated_definition") {
            definition = parse::child_by_field(n, "definition");
            type = parse::node_type(definition);
        }
        Block b;
        b.id = "b" + std::to_string(blocks.size() + 1);
        const auto kind = kKinds.find(type);
        b.kind = kind == kKinds.end() ? "statement" : kind->second;
        b.text = lang_python::first_line(parse::node_text(n, source_), 120);
        b.parent = parent;
        b.line = line_of(n);
        b.end_line = end_line_of(n);
        b.depth = depth;
        if (b.kind == "def" || b.kind == "class") {
            b.writes.push_back(parse::node_text(parse::child_by_field(definition, "name"), source_));
        } else {
            collect_calls(n, b.calls);
            collect_writes(n, type, b.writes);
        }
        blocks.push_back(std::move(b));
        return blocks.back().id;
    }

    // Calls in the block's own code: not inside nested blocks, clauses or definitions.
    void collect_calls(TSNode n, std::vector<std::string>& out) const {
        for (TSNode c : parse::named_children(n)) {
            const std::string type = parse::node_type(c);
            if (type == "block" || kClauses.count(type) || type == "case_clause" || is_definition(type)) continue;
            if (type == "call") {
                const std::string name = parse::node_text(parse::child_by_field(c, "function"), source_);
                if (std::find(out.begin(), out.end(), name) == out.end()) out.push_back(name);
            }
            collect_calls(c, out);
        }
    }

    void add_targets(TSNode target, std::vector<std::string>& out) const {
        const std::string type = parse::node_type(target);
        if (type == "identifier" || type == "attribute") {
            out.push_back(parse::node_text(target, source_));
        } else if (type == "pattern_list" || type == "tuple_pattern" || type == "list_pattern") {
            for (TSNode c : parse::named_children(target)) {
                const std::string t = parse::node_type(c);
                if (t == "identifier" || t == "attribute") out.push_back(parse::node_text(c, source_));
            }
        }
    }

    void collect_writes(TSNode n, const std::string& type, std::vector<std::string>& out) const {
        if (type == "for_statement") {
            add_targets(parse::child_by_field(n, "left"), out);
            return;
        }
        if (type != "expression_statement") return;
        const std::vector<TSNode> children = parse::named_children(n);
        if (children.empty()) return;
        const std::string first = parse::node_type(children.front());
        if (first == "assignment" || first == "augmented_assignment") {
            add_targets(parse::child_by_field(children.front(), "left"), out);
        }
    }

    const std::string& source_;
};

bool find_definition(TSNode n, int def_line, TSNode& out) {
    const std::string type = parse::node_type(n);
    if (type == "function_definition" || type == "class_definition") {
        const TSNode parent = ts_node_parent(n);
        const bool decorated_here = !ts_node_is_null(parent) && parse::node_type(parent) == "decorated_definition" &&
                                    line_of(parent) == def_line;
        if (line_of(n) == def_line || decorated_here) {
            out = n;
            return true;
        }
    }
    for (TSNode c : parse::named_children(n)) {
        if (find_definition(c, def_line, out)) return true;
    }
    return false;
}

}  // namespace

std::vector<Block> body_blocks(const std::string& source, int def_line) {
    const parse::TsParser parser(tree_sitter_python());
    const parse::TsTree tree = parser.parse(source);
    TSNode body = tree.root();
    if (def_line != 0) {
        TSNode definition{};
        if (!find_definition(tree.root(), def_line, definition)) {
            throw core::PvError(core::err::NodeNotFound, "no definition starts on line " + std::to_string(def_line));
        }
        body = parse::child_by_field(definition, "body");
    }
    Walker walker(source);
    walker.walk(body, 0, "");
    return walker.blocks;
}

}  // namespace pv::motion
