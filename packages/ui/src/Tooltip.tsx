"use client";

import { useState, type ReactNode } from "react";

export interface TooltipProps {
  /** Text shown on hover AND on keyboard focus. */
  label: string;
  children: ReactNode;
}

/**
 * Shared tooltip. Icon-only buttons must have a tooltip that is reachable
 * by keyboard focus, not only mouse hover (UI_UX_STANDARDS.md).
 */
export function Tooltip({ label, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
