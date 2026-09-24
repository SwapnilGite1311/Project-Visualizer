#include <gtest/gtest.h>

#include "pv/lang_python/python_adapter.hpp"

using namespace pv;
using namespace pv::lang_python;

namespace {

parse::ProjectIndex sample_index() {
    parse::ProjectIndex index;
    index.add_module_name("app", "app/__init__.py");
    index.add_module_name("app.models", "app/models.py");
    index.add_module_name("app.utils", "app/utils.py");
    index.add_module_name("app.services", "app/services.py");
    index.add_module_name("app.api", "app/api/__init__.py");
    index.add_module_name("app.api.routes", "app/api/routes.py");
    index.add_module_name("main", "main.py");
    index.add_symbol("app/models.py", "User", "class:app/models.py#User");
    index.add_symbol("app/utils.py", "normalize", "function:app/utils.py#normalize");
    return index;
}

parse::ImportTarget resolve(const std::string& importer, const std::string& module, const std::string& name = "",
                            const std::string& alias = "") {
    parse::RawImport imp;
    imp.module = module;
    imp.name = name;
    imp.alias = alias;
    return PythonAdapter().resolve_import(imp, importer, sample_index());
}

void expect_node(const parse::ImportTarget& t, const std::string& id) {
    EXPECT_EQ(t.node_id, id);
    EXPECT_EQ(t.external_name, "");
}

void expect_external(const parse::ImportTarget& t, const std::string& name) {
    EXPECT_EQ(t.node_id, "");
    EXPECT_EQ(t.external_name, name);
}

void expect_unresolved(const parse::ImportTarget& t) {
    EXPECT_EQ(t.node_id, "");
    EXPECT_EQ(t.external_name, "");
}

}  // namespace

TEST(LangPyResolve, PlainImports) {
    expect_external(resolve("main.py", "sys"), "sys");
    expect_external(resolve("main.py", "os.path"), "os");
    expect_node(resolve("main.py", "app.utils", "", "u"), "module:app/utils.py");
    expect_node(resolve("main.py", "app.utils.missing"), "module:app/utils.py");
    expect_node(resolve("main.py", "app.models", "*"), "module:app/models.py");
}

TEST(LangPyResolve, FromImports) {
    expect_node(resolve("app/services.py", ".models", "User"), "class:app/models.py#User");
    expect_node(resolve("app/services.py", ".", "utils"), "module:app/utils.py");
    expect_node(resolve("app/services.py", ".utils", "unknown_fn"), "module:app/utils.py");
    expect_unresolved(resolve("app/services.py", "app.nothing", "x"));
    expect_external(resolve("app/services.py", "numpy", "array"), "numpy");
    expect_unresolved(resolve("app/api/routes.py", "...x", "y"));
    expect_node(resolve("app/api/routes.py", "app.services", "UserService"), "module:app/services.py");
}
