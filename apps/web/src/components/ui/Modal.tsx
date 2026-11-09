"use client";

import { useEffect, type ReactNode } from "react";

export function Modal({
  onClose,
  maxWidth = 480,
  children,
}: {
  onClose: () => void;
  maxWidth?: number;
  children: ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-overlay backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="modal bg-[var(--ag-color-sidebar,rgba(6,26,38,0.90))] backdrop-blur-2xl border border-[var(--ag-color-border,rgba(45,212,191,0.24))] rounded-[20px] shadow-[0_24px_60px_-12px_rgba(2,12,18,0.75)]"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}
