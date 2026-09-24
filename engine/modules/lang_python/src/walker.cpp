#include "walker.hpp"

#include "pv/lang_python/internal.hpp"
#include "pv/parse/ts.hpp"

namespace pv::lang_python {

PythonWalker::PythonWalker(const std::string& source, parse::FileExtraction& out) : source_(source), out_(out) {}

void PythonWalker::walk(TSNode root) {
    visit(root);
}

std::string PythonWalker::current_qualname() const {
    return scope_.empty() ? "" : scope_.back().first;
}

bool PythonWalker::current_is_class() const {
    return !scope_.empty() && scope_.back().second;
}

std::string PythonWalker::unique_qualname(const std::string& base) {
    const int n = ++seen_[base];
    return n == 1 ? base : base + "~" + std::to_string(n);
}

void PythonWalker::visit(TSNode node) {
    const std::string type = parse::node_type(node);
    if (type == "class_definition") { on_definition(node, true); return; }
    if (type == "function_definition") { on_definition(node, false); return; }
    if (type == "import_statement") { on_import(node); return; }
    if (type == "import_from_statement") { on_import_from(node); return; }
    if (type == "call") { on_call(node); }  // no return: calls nested in the arguments are visited below
    for (TSNode child : parse::named_children(node)) visit(child);
}

void PythonWalker::on_definition(TSNode node, bool is_class) {
    TSNode name_node = parse::child_by_field(node, "name");
    if (ts_node_is_null(name_node)) return;
    const std::string name = parse::node_text(name_node, source_);
    const std::string parent = current_qualname();
    parse::RawDefinition def;
    def.kind = is_class ? "class" : "function";
    def.name = name;
    def.qualname = unique_qualname(parent.empty() ? name : parent + "." + name);
    def.parent_qualname = parent;
    def.parent_is_class = current_is_class();
    def.span = parse::node_span(node);
    def.complexity = is_class ? 1 : compute_complexity(node);
    def.signature = first_line(parse::node_text(node, source_), 200);
    TSNode body = parse::child_by_field(node, "body");
    def.docstring = ts_node_is_null(body) ? "" : extract_docstring(body, source_);
    out_.definitions.push_back(def);
    if (is_class) on_bases(node, def.qualname);
    TSNode params = parse::child_by_field(node, "parameters");
    if (!ts_node_is_null(params)) visit(params);   // default values run in the outer scope
    scope_.push_back({def.qualname, is_class});
    if (!ts_node_is_null(body)) visit(body);
    scope_.pop_back();
}

void PythonWalker::on_import(TSNode node) {
    const int line = parse::node_span(node).start_line;
    for (TSNode child : parse::named_children(node)) {
        const std::string type = parse::node_type(child);
        parse::RawImport imp;
        if (type == "dotted_name") {
            imp.module = parse::node_text(child, source_);
        } else if (type == "aliased_import") {
            imp.module = parse::node_text(parse::child_by_field(child, "name"), source_);
            imp.alias = parse::node_text(parse::child_by_field(child, "alias"), source_);
        } else {
            continue;
        }
        imp.line = line;
        imp.scope_qualname = current_qualname();
        out_.imports.push_back(imp);
    }
}

void PythonWalker::on_import_from(TSNode node) {
    const TSNode module_node = parse::child_by_field(node, "module_name");
    if (ts_node_is_null(module_node)) return;
    std::string module;
    for (char c : parse::node_text(module_node, source_)) {
        if (c != ' ') module += c;
    }
    const int line = parse::node_span(node).start_line;
    const uint32_t module_start = ts_node_start_byte(module_node);
    for (TSNode child : parse::named_children(node)) {
        if (ts_node_start_byte(child) == module_start) continue;
        const std::string type = parse::node_type(child);
        parse::RawImport imp;
        imp.module = module;
        if (type == "dotted_name") {
            imp.name = parse::node_text(child, source_);
        } else if (type == "aliased_import") {
            imp.name = parse::node_text(parse::child_by_field(child, "name"), source_);
            imp.alias = parse::node_text(parse::child_by_field(child, "alias"), source_);
        } else if (type == "wildcard_import") {
            imp.name = "*";
        } else {
            continue;
        }
        imp.line = line;
        imp.scope_qualname = current_qualname();
        out_.imports.push_back(imp);
    }
}

void PythonWalker::on_call(TSNode node) {
    const TSNode fn = parse::child_by_field(node, "function");
    if (ts_node_is_null(fn)) return;
    parse::RawCall call;
    call.line = parse::node_span(node).start_line;
    call.caller_qualname = current_qualname();
    const std::string type = parse::node_type(fn);
    if (type == "identifier") {
        call.name = parse::node_text(fn, source_);
    } else if (type == "attribute") {
        call.name = parse::node_text(parse::child_by_field(fn, "attribute"), source_);
        call.object = parse::node_text(parse::child_by_field(fn, "object"), source_);
        if (call.object.size() > 200) call.object.resize(200);
    } else {
        return;
    }
    out_.calls.push_back(call);
}

void PythonWalker::on_bases(TSNode class_node, const std::string& class_qualname) {
    const TSNode sup = parse::child_by_field(class_node, "superclasses");
    if (ts_node_is_null(sup)) return;
    const int line = parse::node_span(class_node).start_line;
    for (TSNode child : parse::named_children(sup)) {
        const std::string type = parse::node_type(child);
        if (type != "identifier" && type != "attribute") continue;
        out_.inherits.push_back(parse::RawInherit{class_qualname, parse::node_text(child, source_), line});
    }
}

}  // namespace pv::lang_python
