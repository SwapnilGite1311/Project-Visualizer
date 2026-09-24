#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/lang_ipynb/notebook.hpp"

using namespace pv;

TEST(IpynbSource, CodeCellsOnly) {
    const std::string nb = R"({"cells":[
      {"cell_type":"markdown","source":["# Title\n"]},
      {"cell_type":"code","source":["%matplotlib inline\n","import os\n"]},
      {"cell_type":"code","source":"x = 1"}
    ]})";
    EXPECT_EQ(lang_ipynb::notebook_to_source(nb), "\nimport os\nx = 1\n");
}

TEST(IpynbSource, ShellEscapesBlanked) {
    const std::string nb = R"({"cells":[{"cell_type":"code","source":["  !pip install x\n","y = 2\n"]}]})";
    EXPECT_EQ(lang_ipynb::notebook_to_source(nb), "\ny = 2\n");
}

TEST(IpynbSource, InvalidJsonThrows) {
    EXPECT_THROW(lang_ipynb::notebook_to_source("{not json"), core::PvError);
    EXPECT_THROW(lang_ipynb::notebook_to_source(R"({"metadata":{}})"), core::PvError);
}
