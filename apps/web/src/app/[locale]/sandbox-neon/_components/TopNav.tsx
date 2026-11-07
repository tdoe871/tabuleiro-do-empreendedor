"use client";

import { Bell, Download, Flame, Menu, Settings } from "lucide-react";

export interface TopNavProps {
  onOpenSidebar: () => void;
  onExport: () => void;
  onNotify: (message: string) => void;
  seasonLabel?: string;
  seasonTitle?: string;
  streakDays?: number;
}

export function TopNav({
  onOpenSidebar,
  onExport,
  onNotify,
  seasonLabel = "Temporada 02",
  seasonTitle = "EXPEDIÇÃO FUTURO",
  streakDays = 12,
}: TopNavProps) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="menu-button"
        onClick={onOpenSidebar}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      <div className="season">
        <span className="live-dot" />
        <span>{seasonLabel}</span>
        <strong>{seasonTitle}</strong>
      </div>

      <div className="topbar-actions">
        <div className="streak">
          <Flame size={17} fill="currentColor" />
          <span>{streakDays} dias</span>
        </div>

        <button type="button" className="export-button" onClick={onExport}>
          <Download size={16} />
          <span>Exportar</span>
        </button>

        <button
          type="button"
          className="icon-button notification"
          aria-label="Notificações"
          onClick={() => onNotify("Você está em dia!")}
        >
          <Bell size={18} />
          <i />
        </button>

        <button
          type="button"
          className="icon-button"
          aria-label="Configurações"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
