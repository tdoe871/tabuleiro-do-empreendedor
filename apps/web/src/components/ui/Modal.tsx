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
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}
