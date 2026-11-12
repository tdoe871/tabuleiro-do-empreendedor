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
      className="modal-overlay bg-black/60 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="modal bg-none bg-[#24221f] border border-[#464036] rounded-xl text-[#f4f0e5] shadow-[0_0_40px_rgba(0,0,0,0.8)] transition-all duration-300"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}
