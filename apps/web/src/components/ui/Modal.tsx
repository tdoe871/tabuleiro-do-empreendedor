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
      className="modal-overlay bg-[#0B0F19]/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="modal bg-none bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl text-slate-200 shadow-[0_0_50px_rgba(0,0,0,0.85)] transition-all duration-300 hover:border-white/10"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}
