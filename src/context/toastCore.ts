import { createContext, useContext } from "react";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

export type ShowToast = (text: string, kind?: ToastKind) => void;

export const ToastCtx = createContext<ShowToast | null>(null);

export const useToast = (): ShowToast => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
};
