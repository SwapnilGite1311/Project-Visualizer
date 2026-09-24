#include <gtest/gtest.h>

#include "pv/lang_ipynb/notebook_adapter.hpp"

using namespace pv;

TEST(IpynbAdapter, ExtractsPython) {
    const lang_ipynb::NotebookAdapter adapter;
    EXPECT_EQ(adapter.id(), "python_notebook");
    EXPECT_EQ(adapter.extensions(), (std::vector<std::string>{".ipynb"}));
    const std::string nb = R"({"cells":[{"cell_type":"code","source":["def helper(a):\n","    return a\n"]}]})";
    const parse::FileExtraction fx = adapter.extract("notes/explore.ipynb", nb);
    EXPECT_EQ(fx.language, "python");
    ASSERT_EQ(fx.definitions.size(), 1u);
    EXPECT_EQ(fx.definitions[0].name, "helper");
    EXPECT_EQ(adapter.module_names("notes/explore.ipynb"), (std::vector<std::string>{"notes.explore"}));
}
