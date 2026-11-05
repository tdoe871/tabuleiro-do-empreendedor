"use client";

import type { ReactNode } from "react";

export function Modal({
  onClose,
  maxWidth = 480,
  children,
}: {
  onClose: () => void;
  maxWidth?: number;
  children: ReactNode;
}) {
  return (
    <div
      className="modal-overlay backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal bg-neon-bg/90 backdrop-blur-xl border border-white/15 shadow-glow-purple"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}
