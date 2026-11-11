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
    <header className="topbar bg-[#0B0F19]/85 backdrop-blur-xl border-b border-white/5 text-slate-200">
      <button
        type="button"
        className="menu-button bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all"
        onClick={onOpenSidebar}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      <div className="season bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl px-3.5 py-2 transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10">
        <span className="live-dot" />
        <span className="text-slate-400">{seasonLabel}</span>
        <strong className="text-white">{seasonTitle}</strong>
      </div>

      <div className="topbar-actions">
        <div className="streak bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 text-[#ebc589] transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10">
          <Flame size={17} fill="currentColor" />
          <span>{streakDays} dias</span>
        </div>

        <button
          type="button"
          className="export-button bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg transition-all"
          onClick={onExport}
        >
          <Download size={16} />
          <span>Exportar</span>
        </button>

        <button
          type="button"
          className="icon-button notification bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
          aria-label="Notificações"
          onClick={() => onNotify("Você está em dia!")}
        >
          <Bell size={18} />
          <i />
        </button>

        <button
          type="button"
          className="icon-button bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
          aria-label="Configurações"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
