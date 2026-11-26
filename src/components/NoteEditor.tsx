import { useId, useLayoutEffect, useRef } from "react";
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import { IndentIcon, ListBullet, ListOrdered, OutdentIcon } from "./Icons";
import {
  autoBullet,
  handleBackspace,
  handleEnter,
  indentLines,
  outdentLines,
  toggleList,
  type EditResult,
} from "../utils/noteFormat";

type Op = (text: string, start: number, end: number) => EditResult | null;

const MAX_NOTE_LENGTH = 10_000;

const TOOLS: { label: string; icon: ReactNode; op: Op }[] = [
  {
    label: "Bullet list (type - or *)",
    icon: <ListBullet size={15} />,
    op: (t, s, e) => toggleList(t, s, e, "bullet"),
  },
  {
    label: "Numbered list (type 1.)",
    icon: <ListOrdered size={15} />,
    op: (t, s, e) => toggleList(t, s, e, "number"),
  },
  {
    label: "Outdent (Shift+Tab)",
    icon: <OutdentIcon size={15} />,
    op: outdentLines,
  },
  { label: "Indent (Tab)", icon: <IndentIcon size={15} />, op: indentLines },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  rows?: number;
  /** Classes for the outer wrapper (e.g. flex-1 to fill a panel) */
  className?: string;
}

const NoteEditor = ({
  value,
  onChange,
  placeholder,
  ariaLabel = "Note",
  rows = 4,
  className = "",
}: Props) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const pendingSel = useRef<[number, number] | null>(null);

  // Restore the caret after a programmatic edit
  useLayoutEffect(() => {
    const sel = pendingSel.current;
    if (ref.current && sel) {
      ref.current.setSelectionRange(sel[0], sel[1]);
      pendingSel.current = null;
    }
  }, [value]);

  const apply = (r: EditResult | null) => {
    if (!r) return false;
    // No text change → no re-render, so set the selection now (a pending one
    // would otherwise be applied on the next unrelated keystroke)
    if (ref.current && r.text === ref.current.value) {
      ref.current.setSelectionRange(r.start, r.end);
      return true;
    }
    pendingSel.current = [r.start, r.end];
    onChange(r.text);
    return true;
  };

  const runTool = (op: Op) => {
    const ta = ref.current;
    if (!ta) return;
    apply(op(ta.value, ta.selectionStart, ta.selectionEnd));
    ta.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    // Tab is used for indenting, so Escape is the keyboard way out of the editor
    // (inside a dialog, Escape closes the dialog instead)
    if (e.key === "Escape" && !e.currentTarget.closest("[role=dialog]")) {
      e.currentTarget.blur();
      return;
    }
    const { value: t, selectionStart: s, selectionEnd: en } = e.currentTarget;
    let r: EditResult | null = null;
    if (e.key === "Tab")
      r = e.shiftKey ? outdentLines(t, s, en) : indentLines(t, s, en);
    else if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    )
      r = handleEnter(t, s, en);
    else if (e.key === "Backspace") r = handleBackspace(t, s, en);
    if (r) {
      e.preventDefault();
      apply(r);
    }
  };;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.target;
    const r = autoBullet(ta.value, ta.selectionStart);
    if (r && r.text !== ta.value) apply(r);
    else onChange(ta.value);
  };

  return (
    <div
      className={`flex flex-col rounded-xl border border-zinc-700 bg-zinc-800
                  focus-within:ring-2 focus-within:ring-amber-400/50 ${className}`}
    >
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex items-center gap-0.5 px-1.5 py-1 border-b border-zinc-700/70"
      >
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            // keep focus & selection in the textarea
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runTool(tool.op)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
          >
            {tool.icon}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        maxLength={MAX_NOTE_LENGTH}
        aria-label={ariaLabel}
        aria-describedby={hintId}
        placeholder={placeholder}
        className="flex-1 w-full bg-transparent text-zinc-100 placeholder:text-zinc-600 px-3 py-2.5
                   text-sm leading-relaxed resize-none focus:outline-none"
      />
      <span id={hintId} className="sr-only">
        Tab indents and Shift+Tab outdents. Press Escape to leave the editor.
      </span>
    </div>
  );
};

export default NoteEditor;
