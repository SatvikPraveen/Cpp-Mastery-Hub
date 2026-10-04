#include "cppmastery/source_text.hpp"

#include <gtest/gtest.h>

using cppmastery::Position;
using cppmastery::SourceText;

TEST(SourceText, EmptyDocumentHasNoLines) {
    SourceText s("");
    EXPECT_EQ(s.lineCount(), 0u);
    EXPECT_EQ(s.positionAt(0), (Position{1, 1}));
}

TEST(SourceText, LineTableHandlesTrailingNewline) {
    SourceText s("a\nbb\nccc\n");
    ASSERT_EQ(s.lineCount(), 3u);
    EXPECT_EQ(s.line(1), "a");
    EXPECT_EQ(s.line(2), "bb");
    EXPECT_EQ(s.line(3), "ccc");
}

TEST(SourceText, LineTableWithoutTrailingNewline) {
    SourceText s("a\nbb");
    ASSERT_EQ(s.lineCount(), 2u);
    EXPECT_EQ(s.line(2), "bb");
}

TEST(SourceText, CrLfIsStripped) {
    SourceText s("x\r\ny\r\n");
    EXPECT_EQ(s.line(1), "x");
    EXPECT_EQ(s.line(2), "y");
}

TEST(SourceText, PositionMapping) {
    SourceText s("ab\ncd\n");
    EXPECT_EQ(s.positionAt(0), (Position{1, 1}));
    EXPECT_EQ(s.positionAt(1), (Position{1, 2}));
    EXPECT_EQ(s.positionAt(2), (Position{1, 3}));  // the newline itself
    EXPECT_EQ(s.positionAt(3), (Position{2, 1}));
    EXPECT_EQ(s.positionAt(5), (Position{2, 3}));
    EXPECT_EQ(s.positionAt(99), (Position{2, 4}));  // clamped to end
}
