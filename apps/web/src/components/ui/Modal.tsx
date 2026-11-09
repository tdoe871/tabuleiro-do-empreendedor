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
        className="modal bg-[#14161C]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}
