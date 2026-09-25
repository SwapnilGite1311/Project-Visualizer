#include <gtest/gtest.h>

#include "pv/core/error.hpp"
#include "pv/core/text.hpp"
#include "pv/motion/body.hpp"
#include "pv/session/test_env.hpp"

using namespace pv;
using motion::Block;
using Strings = std::vector<std::string>;

namespace {

std::string fixture(const std::string& rel) { return core::read_file_text(session::pyproj_small_path() + "/" + rel); }

void expect_block(const Block& b, const std::string& id, const std::string& kind, int line, int depth,
                  const std::string& parent) {
    EXPECT_EQ(b.id, id);
    EXPECT_EQ(b.kind, kind) << id;
    EXPECT_EQ(b.line, line) << id;
    EXPECT_EQ(b.depth, depth) << id;
    EXPECT_EQ(b.parent, parent) << id;
}

const char* kLoops = R"(def f(items):
    total = 0
    for i, x in enumerate(items):
        if x > 10:
            break
        elif x < 0:
            continue
        else:
            total += x
    else:
        pass
    while total > 100:
        total -= 1
    try:
        with open("a") as fh:
            data = fh.read()
    except OSError as e:
        data = ""
    else:
        pass
    finally:
        close()
    def inner():
        return 1
    return total
)";

}  // namespace

TEST(MotionBody, Method) {
    const auto blocks = motion::body_blocks(fixture("app/services.py"), 8);
    ASSERT_EQ(blocks.size(), 4u);
    expect_block(blocks[0], "b1", "if", 9, 0, "");
    EXPECT_EQ(blocks[0].end_line, 10);
    EXPECT_EQ(blocks[0].text, "if not is_valid(user_id):");
    EXPECT_EQ(blocks[0].calls, Strings{"is_valid"});
    expect_block(blocks[1], "b2", "raise", 10, 1, "b1");
    EXPECT_EQ(blocks[1].calls, Strings{"ValueError"});
    expect_block(blocks[2], "b3", "statement", 11, 0, "");
    EXPECT_EQ(blocks[2].writes, Strings{"user"});
    EXPECT_EQ(blocks[2].calls, (Strings{"User", "normalize"}));
    expect_block(blocks[3], "b4", "return", 12, 0, "");
    EXPECT_EQ(blocks[3].calls, Strings{"self.format_user"});
}

TEST(MotionBody, NestedReturn) {
    const auto blocks = motion::body_blocks(fixture("app/models.py"), 14);
    ASSERT_EQ(blocks.size(), 3u);
    expect_block(blocks[0], "b1", "if", 15, 0, "");
    EXPECT_EQ(blocks[0].end_line, 16);
    EXPECT_TRUE(blocks[0].calls.empty());
    expect_block(blocks[1], "b2", "return", 16, 1, "b1");
    EXPECT_EQ(blocks[1].calls, Strings{"self.name.title"});
    expect_block(blocks[2], "b3", "return", 17, 0, "");
}

TEST(MotionBody, ClassBody) {
    const auto blocks = motion::body_blocks(fixture("app/models.py"), 9);
    ASSERT_EQ(blocks.size(), 2u);
    expect_block(blocks[0], "b1", "def", 10, 0, "");
    EXPECT_EQ(blocks[0].end_line, 12);
    EXPECT_EQ(blocks[0].writes, Strings{"__init__"});
    expect_block(blocks[1], "b2", "def", 14, 0, "");
    EXPECT_EQ(blocks[1].end_line, 17);
    EXPECT_EQ(blocks[1].writes, Strings{"display"});
}

TEST(MotionBody, Module) {
    const auto blocks = motion::body_blocks(fixture("main.py"), 0);
    ASSERT_EQ(blocks.size(), 6u);
    const Strings kinds{"statement", "statement", "statement", "def", "if", "statement"};
    const std::vector<int> lines{1, 2, 4, 7, 14, 15};
    for (std::size_t i = 0; i < blocks.size(); ++i) {
        EXPECT_EQ(blocks[i].kind, kinds[i]) << i;
        EXPECT_EQ(blocks[i].line, lines[i]) << i;
    }
    expect_block(blocks[5], "b6", "statement", 15, 1, "b5");
    EXPECT_EQ(blocks[5].calls, (Strings{"sys.exit", "main"}));
}

TEST(MotionBody, LoopsAndClauses) {
    const auto b = motion::body_blocks(kLoops, 1);
    ASSERT_EQ(b.size(), 23u);
    expect_block(b[1], "b2", "for", 3, 0, "");
    EXPECT_EQ(b[1].end_line, 11);
    EXPECT_EQ(b[1].writes, (Strings{"i", "x"}));
    EXPECT_EQ(b[1].calls, Strings{"enumerate"});
    expect_block(b[2], "b3", "if", 4, 1, "b2");
    expect_block(b[3], "b4", "break", 5, 2, "b3");
    expect_block(b[4], "b5", "elif", 6, 1, "b2");
    expect_block(b[5], "b6", "continue", 7, 2, "b5");
    expect_block(b[6], "b7", "else", 8, 1, "b2");
    expect_block(b[7], "b8", "statement", 9, 2, "b7");
    EXPECT_EQ(b[7].writes, Strings{"total"});
    expect_block(b[8], "b9", "else", 10, 0, "");
    expect_block(b[9], "b10", "pass", 11, 1, "b9");
    expect_block(b[10], "b11", "while", 12, 0, "");
    expect_block(b[12], "b13", "try", 14, 0, "");
    expect_block(b[13], "b14", "with", 15, 1, "b13");
    EXPECT_EQ(b[13].calls, Strings{"open"});
    expect_block(b[14], "b15", "statement", 16, 2, "b14");
    EXPECT_EQ(b[14].writes, Strings{"data"});
    EXPECT_EQ(b[14].calls, Strings{"fh.read"});
    expect_block(b[15], "b16", "except", 17, 0, "");
    expect_block(b[16], "b17", "statement", 18, 1, "b16");
    expect_block(b[17], "b18", "else", 19, 0, "");
    expect_block(b[19], "b20", "finally", 21, 0, "");
    EXPECT_EQ(b[20].calls, Strings{"close"});
    expect_block(b[21], "b22", "def", 23, 0, "");
    EXPECT_EQ(b[21].end_line, 24);
    EXPECT_EQ(b[21].writes, Strings{"inner"});
    expect_block(b[22], "b23", "return", 25, 0, "");
}

TEST(MotionBody, DecoratedAndMissing) {
    const std::string src = "class A:\n    @staticmethod\n    def s():\n        return 1\n";
    const auto cls = motion::body_blocks(src, 1);
    ASSERT_EQ(cls.size(), 1u);
    expect_block(cls[0], "b1", "def", 2, 0, "");
    EXPECT_EQ(cls[0].writes, Strings{"s"});
    for (int line : {2, 3}) {
        const auto fn = motion::body_blocks(src, line);
        ASSERT_EQ(fn.size(), 1u) << line;
        expect_block(fn[0], "b1", "return", 4, 0, "");
    }
    try {
        motion::body_blocks(src, 99);
        FAIL() << "expected NodeNotFound";
    } catch (const core::PvError& e) {
        EXPECT_EQ(e.code(), core::err::NodeNotFound);
    }
}
