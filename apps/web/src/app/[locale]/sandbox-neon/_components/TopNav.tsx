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
    <header className="topbar bg-white border-b border-slate-200 text-slate-900">
      <button
        type="button"
        className="menu-button bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all"
        onClick={onOpenSidebar}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      <div className="season bg-white border border-slate-200 rounded-xl shadow-sm px-3.5 py-2 transition-all duration-300 hover:border-purple-300 hover:shadow-md">
        <span className="live-dot" />
        <span className="text-slate-500">{seasonLabel}</span>
        <strong className="text-slate-900">{seasonTitle}</strong>
      </div>

      <div className="topbar-actions">
        <div className="streak bg-white border border-slate-200 rounded-xl shadow-sm text-amber-600 transition-all duration-300 hover:border-purple-300">
          <Flame size={17} fill="currentColor" />
          <span>{streakDays} dias</span>
        </div>

        <button
          type="button"
          className="export-button bg-none bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-lg shadow-sm active:scale-95 transition-all"
          onClick={onExport}
        >
          <Download size={16} />
          <span>Exportar</span>
        </button>

        <button
          type="button"
          className="icon-button notification bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm transition-all"
          aria-label="Notificações"
          onClick={() => onNotify("Você está em dia!")}
        >
          <Bell size={18} />
          <i />
        </button>

        <button
          type="button"
          className="icon-button bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm transition-all"
          aria-label="Configurações"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
