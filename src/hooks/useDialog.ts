import { useEffect, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog behaviour: moves focus inside on open (element marked
 * `data-autofocus`, else the first focusable), traps Tab, closes on Escape and
 * restores focus to the previously focused element on close.
 */
export const useDialog = <T extends HTMLElement>(onClose: () => void) => {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const el = ref.current;
    const target =
      el?.querySelector<HTMLElement>("[data-autofocus]") ??
      el?.querySelector<HTMLElement>(FOCUSABLE) ??
      el;
    target?.focus();

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  // Keep Tab inside the dialog (editors that use Tab themselves call preventDefault first)
  const onKeyDown = (e: KeyboardEvent<T>) => {
    if (e.key !== "Tab" || e.defaultPrevented || !ref.current) return;
    const items = Array.from(
      ref.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((x) => x.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return { ref, onKeyDown };
};
