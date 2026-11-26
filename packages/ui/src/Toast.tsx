import type { ReactNode } from "react";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface ToastProps {
  kind: ToastKind;
  message: string;
  onClose?: () => void;
}

const KIND_STYLES: Record<ToastKind, string> = {
  success: "border-green-500 bg-green-50 text-green-900",
  error: "border-red-500 bg-red-50 text-red-900",
  warning: "border-amber-500 bg-amber-50 text-amber-900",
  info: "border-blue-500 bg-blue-50 text-blue-900",
};

/**
 * Shared toast/popup. Success, failure and warning messages must use a
 * toast or popup (UI_UX_STANDARDS.md), never a bare `alert()`.
 * Use `role="status"` for success/info and `role="alert"` for errors.
 */
export function Toast({ kind, message, onClose }: ToastProps) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 text-sm shadow-md transition-opacity duration-150 motion-reduce:transition-none ${KIND_STYLES[kind]}`}
    >
      <span className="flex-1">{message}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="rounded px-1 font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

export function ToastContainer({ children }: { children: ReactNode }) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      {children}
    </div>
  );
}
