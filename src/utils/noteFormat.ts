// Plain-text list editing helpers (bullets, numbering, indentation) for the
// note editor. Notes stay plain strings, so they render anywhere with
// `whitespace-pre-wrap` and remain backward compatible with existing data.

export interface EditResult {
  text: string;
  start: number;
  end: number;
}

export const INDENT = "    ";
const BULLETS = ["•", "◦", "▪"];
// <indent><bullet | number + . or )><space>
const LIST_RE = /^(\s*)(?:([-*•◦▪])|(\d+)([.)])) /;

const lineStart = (t: string, pos: number) =>
  pos === 0 ? 0 : t.lastIndexOf("\n", pos - 1) + 1;

const lineEnd = (t: string, pos: number) => {
  const e = t.indexOf("\n", pos);
  return e === -1 ? t.length : e;
};

// Lines touched by the selection (a selection ending right after a newline
// doesn't include the following line)
const blockOf = (t: string, start: number, end: number) => {
  const effEnd = end > start && t[end - 1] === "\n" ? end - 1 : end;
  return { bs: lineStart(t, start), be: lineEnd(t, effEnd) };
};

/** Bullet symbol by depth, sequential numbers per depth. */
export const normalizeLists = (text: string): string => {
  const counters: number[] = [];
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(LIST_RE);
      if (!m) {
        // Top-level plain text ends any list; indented text continues it
        if (line.trim() && !/^\s/.test(line)) counters.length = 0;
        return line;
      }
      const ind = m[1].length;
      counters.length = Math.min(counters.length, ind + 1);
      const rest = line.slice(m[0].length);
      if (m[2] !== undefined) {
        counters[ind] = 0;
        const depth = Math.floor(ind / INDENT.length);
        return `${m[1]}${BULLETS[depth % BULLETS.length]} ${rest}`;
      }
      counters[ind] = (counters[ind] ?? 0) + 1;
      return `${m[1]}${counters[ind]}${m[4]} ${rest}`;
    })
    .join("\n");
};

// Map a caret position across normalizeLists (line count never changes and
// edits only happen at the start of a line, so keep the distance from line end)
const remap = (oldText: string, newText: string, pos: number) => {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  let off = 0;
  let li = 0;
  while (li < oldLines.length - 1 && off + oldLines[li].length < pos) {
    off += oldLines[li].length + 1;
    li++;
  }
  const col = pos - off;
  const delta = newLines[li].length - oldLines[li].length;
  let newOff = 0;
  for (let i = 0; i < li; i++) newOff += newLines[i].length + 1;
  return newOff + Math.max(0, Math.min(newLines[li].length, col + delta));
};

const finalize = (r: EditResult): EditResult => {
  const text = normalizeLists(r.text);
  if (text === r.text) return r;
  return {
    text,
    start: remap(r.text, text, r.start),
    end: remap(r.text, text, r.end),
  };
};

const mapLines = (
  text: string,
  start: number,
  end: number,
  fn: (line: string) => string,
): EditResult => {
  const { bs, be } = blockOf(text, start, end);
  const oldLines = text.slice(bs, be).split("\n");
  const newLines = oldLines.map(fn);
  const block = newLines.join("\n");
  const out = text.slice(0, bs) + block + text.slice(be);
  if (start === end) {
    const caret = Math.max(
      bs,
      start + newLines[0].length - oldLines[0].length,
    );
    return finalize({ text: out, start: caret, end: caret });
  }
  return finalize({ text: out, start: bs, end: bs + block.length });
};

const parseLine = (line: string) => {
  const m = line.match(LIST_RE);
  if (m)
    return {
      indent: m[1],
      rest: line.slice(m[0].length),
      kind: m[2] !== undefined ? "bullet" : "number",
    };
  const indent = line.match(/^\s*/)![0];
  return { indent, rest: line.slice(indent.length), kind: null };
};

export const indentLines = (t: string, s: number, e: number) =>
  mapLines(t, s, e, (l) => INDENT + l);

export const outdentLines = (t: string, s: number, e: number) =>
  mapLines(t, s, e, (l) => l.replace(/^(?: {1,4}|\t)/, ""));

/** Toggle bullet / numbered list on the selected lines. */
export const toggleList = (
  t: string,
  s: number,
  e: number,
  kind: "bullet" | "number",
) => {
  const { bs, be } = blockOf(t, s, e);
  const lines = t.slice(bs, be).split("\n");
  const allSame = lines
    .filter((l) => l.trim())
    .every((l) => parseLine(l).kind === kind);
  return mapLines(t, s, e, (l) => {
    const p = parseLine(l);
    if (allSame && l.trim()) return p.indent + p.rest;
    if (!l.trim() && lines.length > 1) return l;
    return `${p.indent}${kind === "bullet" ? "•" : "1."} ${p.rest}`;
  });
};

/** Enter inside a list item: continue the list, or end it on an empty item. */
export const handleEnter = (
  t: string,
  s: number,
  e: number,
): EditResult | null => {
  if (s !== e) return null;
  const ls = lineStart(t, s);
  const le = lineEnd(t, s);
  const line = t.slice(ls, le);
  const m = line.match(LIST_RE);
  if (!m || s - ls < m[0].length) return null;
  if (!line.slice(m[0].length).trim()) {
    // Empty item: nested → move up a level, top level → leave the list
    if (m[1].length) return outdentLines(t, s, e);
    return finalize({ text: t.slice(0, ls) + t.slice(le), start: ls, end: ls });
  }
  const marker =
    m[2] !== undefined ? `${m[2]} ` : `${Number(m[3]) + 1}${m[4]} `;
  const ins = `\n${m[1]}${marker}`;
  const pos = s + ins.length;
  return finalize({ text: t.slice(0, s) + ins + t.slice(s), start: pos, end: pos });
};

/** Backspace right after a list marker removes the marker (keeps the text). */
export const handleBackspace = (
  t: string,
  s: number,
  e: number,
): EditResult | null => {
  if (s !== e) return null;
  const ls = lineStart(t, s);
  const m = t.slice(ls, lineEnd(t, s)).match(LIST_RE);
  if (!m || s - ls !== m[0].length) return null;
  const pos = ls + m[1].length;
  return finalize({
    text: t.slice(0, pos) + t.slice(s),
    start: pos,
    end: pos,
  });
};

/** Typing "- " or "* " at the start of a line turns it into a bullet. */
export const autoBullet = (t: string, caret: number): EditResult | null => {
  const before = t.slice(lineStart(t, caret), caret);
  if (!/^\s*[-*] $/.test(before)) return null;
  return finalize({ text: t, start: caret, end: caret });
};
