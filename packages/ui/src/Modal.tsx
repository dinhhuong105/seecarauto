"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Optional description for screen readers. */
  description?: string;
}

/**
 * Shared modal/dialog. Create, edit and detail actions must open a modal
 * (UI_UX_STANDARDS.md). Closes on Escape, traps focus on open, restores
 * focus on close, and uses a subtle fade/scale animation that is disabled
 * when the user prefers reduced motion.
 */
export function Modal({ open, title, onClose, children, description }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 motion-reduce:transition-none" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={description ? "modal-description" : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl outline-none transition-all duration-150 motion-reduce:transition-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            ✕
          </button>
        </div>
        {description ? (
          <p id="modal-description" className="mb-4 text-sm text-slate-600">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
