import { describe, expect, it } from "vitest";
import {
  autoBullet,
  handleBackspace,
  handleEnter,
  indentLines,
  normalizeLists,
  outdentLines,
  toggleList,
} from "./noteFormat";

const end = (t: string) => t.length;

describe("normalizeLists", () => {
  it("uses a bullet symbol per depth", () => {
    expect(normalizeLists("- a\n    - b\n        - c")).toBe(
      "• a\n    ◦ b\n        ▪ c",
    );
  });

  it("renumbers sequentially per depth", () => {
    expect(normalizeLists("1. a\n5. b\n    9. x\n    9. y\n7. c")).toBe(
      "1. a\n2. b\n    1. x\n    2. y\n3. c",
    );
  });

  it("restarts numbering after a top-level plain line", () => {
    expect(normalizeLists("1. a\n2. b\nplain\n7. c")).toBe(
      "1. a\n2. b\nplain\n1. c",
    );
  });

  it("leaves plain text untouched", () => {
    expect(normalizeLists("hello\nworld")).toBe("hello\nworld");
  });
});

describe("handleEnter", () => {
  it("continues a bullet list", () => {
    const t = "• a";
    expect(handleEnter(t, end(t), end(t))).toEqual({
      text: "• a\n• ",
      start: 6,
      end: 6,
    });
  });

  it("continues a numbered list with the next number", () => {
    const t = "1. a";
    expect(handleEnter(t, end(t), end(t))?.text).toBe("1. a\n2. ");
  });

  it("ends the list on an empty top-level item", () => {
    const t = "• a\n• ";
    expect(handleEnter(t, end(t), end(t))?.text).toBe("• a\n");
  });

  it("outdents an empty nested item", () => {
    const t = "1. a\n    1. ";
    expect(handleEnter(t, end(t), end(t))?.text).toBe("1. a\n2. ");
  });

  it("returns null outside lists and with a selection", () => {
    expect(handleEnter("plain", 5, 5)).toBeNull();
    expect(handleEnter("• a", 0, 3)).toBeNull();
  });
});

describe("handleBackspace", () => {
  it("removes the marker right after it, keeping indentation", () => {
    const t = "    ◦ ";
    expect(handleBackspace(t, end(t), end(t))).toEqual({
      text: "    ",
      start: 4,
      end: 4,
    });
  });

  it("does nothing elsewhere", () => {
    expect(handleBackspace("• abc", 5, 5)).toBeNull();
  });
});

describe("indent / outdent", () => {
  it("indents and re-symbols a bullet, keeping the caret on the text", () => {
    const r = indentLines("• a", 3, 3);
    expect(r.text).toBe("    ◦ a");
    expect(r.start).toBe(7);
  });

  it("indents every selected line", () => {
    expect(indentLines("x\ny", 0, 3).text).toBe("    x\n    y");
  });

  it("outdent is a no-op at column 0", () => {
    expect(outdentLines("abc", 1, 1).text).toBe("abc");
  });
});

describe("toggleList", () => {
  it("adds and removes numbering on a selection", () => {
    const on = toggleList("x\ny\nz", 0, 5, "number");
    expect(on.text).toBe("1. x\n2. y\n3. z");
    expect(toggleList(on.text, 0, on.text.length, "number").text).toBe(
      "x\ny\nz",
    );
  });

  it("converts numbers to bullets", () => {
    expect(toggleList("1. a\n2. b", 0, 9, "bullet").text).toBe("• a\n• b");
  });
});

describe("autoBullet", () => {
  it("turns '- ' at line start into a bullet", () => {
    expect(autoBullet("- ", 2)?.text).toBe("• ");
  });

  it("ignores dashes mid-line", () => {
    expect(autoBullet("a - ", 4)).toBeNull();
  });
});
