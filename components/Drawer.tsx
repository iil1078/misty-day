"use client";

import { useId, useRef } from "react";
import { useDialogBehavior } from "./useDialogBehavior";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Rendered beside the title, e.g. a status pill. */
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** A full-height side sheet that slides in from the right; for dense, multi-section workflows. */
export function Drawer({ open, onClose, title, description, badge, footer, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useDialogBehavior(open, panelRef, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="relative flex h-full w-full max-w-5xl animate-slide-in-right flex-col bg-slate-50 shadow-2xl ring-1 ring-slate-900/10"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              {badge}
            </div>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-slate-200 bg-white px-5 py-3.5 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}
