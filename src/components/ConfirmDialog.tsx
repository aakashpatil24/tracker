import { createPortal } from "react-dom";
import { useId } from "react";
import { useDialog } from "../hooks/useDialog";

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: Props) => {
  const { ref, onKeyDown } = useDialog<HTMLDivElement>(onCancel);
  const titleId = useId();
  const descId = useId();

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-pop-in"
      >
        <h3 id={titleId} className="font-semibold text-zinc-100">
          {title}
        </h3>
        <p id={descId} className="text-sm text-zinc-400 mt-2 wrap-break-word">
          {message}
        </p>
        <div className="flex gap-2 mt-5">
          <button
            data-autofocus
            onClick={onCancel}
            className="flex-1 py-2.5 border border-zinc-700 rounded-xl text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              danger
                ? "bg-rose-500 hover:bg-rose-400 text-white"
                : "bg-amber-400 hover:bg-amber-300 text-zinc-900"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmDialog;
