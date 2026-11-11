"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Compass,
  Gem,
  HelpCircle,
  Home,
  MoreHorizontal,
  Swords,
  Target,
  Trophy,
  Users,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";

export interface RpgRoleOption {
  name: string;
  icon: LucideIcon;
  color: string;
  level: number;
}

export const DEFAULT_RPG_ROLES: readonly RpgRoleOption[] = [
  { name: "Visionário", icon: WandSparkles, color: "#b7ff5a", level: 8 },
  { name: "Estrategista", icon: Compass, color: "#9b8cff", level: 6 },
  { name: "Construtor", icon: Swords, color: "#50ddff", level: 5 },
];

interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

const NAV_ITEMS: readonly NavItemConfig[] = [
  { id: "inicio", label: "Meu tabuleiro", href: "#inicio", icon: Home },
  { id: "jornada", label: "Jornada", href: "#jornada", icon: Target },
  { id: "ranking", label: "Ranking", href: "#ranking", icon: Trophy },
  {
    id: "comunidade",
    label: "Comunidade",
    href: "#comunidade",
    icon: Users,
    badge: 3,
  },
];

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: string;
  onSelectRole: (roleName: string) => void;
  onNotify: (message: string) => void;
  roles?: readonly RpgRoleOption[];
}

function LogoMark() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export function Sidebar({
  isOpen,
  onClose,
  activeRole,
  onSelectRole,
  onNotify,
  roles = DEFAULT_RPG_ROLES,
}: SidebarProps) {
  const [activeNav, setActiveNav] = useState<string>("inicio");

  return (
    <>
      <aside
        className={`sidebar bg-none bg-[#1E1B4B] border-r border-indigo-950 text-slate-200 ${
          isOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="brand">
          <LogoMark />
          <div>
            <strong className="text-white">TABULEIRO</strong>
            <span className="text-indigo-200/70">DO EMPREENDEDOR</span>
          </div>
          <button
            type="button"
            className="mobile-close bg-indigo-950/60 border border-indigo-800/50 text-slate-200 transition-all"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="main-nav" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`nav-item bg-none rounded-lg transition-all duration-200 ${
                  isActive
                    ? "active bg-indigo-900/70 border border-indigo-400/30 text-white"
                    : "text-indigo-200/70 hover:bg-indigo-900/40 hover:text-white"
                }`}
                onClick={() => {
                  setActiveNav(item.id);
                  onClose();
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <em className="bg-[#6366F1] text-white">{item.badge}</em>
                )}
                {isActive && <i className="bg-indigo-300" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-section">
          <div className="section-heading text-indigo-200/70">
            <span>SEU PAPEL RPG</span>
            <HelpCircle size={14} />
          </div>
          <div className="roles">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = activeRole === role.name;
              return (
                <button
                  key={role.name}
                  type="button"
                  className={`role bg-none rounded-lg border transition-all duration-200 ${
                    isSelected
                      ? "selected bg-indigo-900/70 border-indigo-400/50 text-white"
                      : "bg-transparent border-transparent text-slate-200 hover:bg-indigo-900/40"
                  }`}
                  style={{ "--role-color": role.color } as CSSProperties}
                  onClick={() => onSelectRole(role.name)}
                >
                  <span className="role-icon">
                    <Icon size={17} />
                  </span>
                  <span>
                    <strong className="text-white">{role.name}</strong>
                    <small className="text-indigo-200/70">
                      Nível {role.level}
                    </small>
                  </span>
                  {isSelected && <Check size={14} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sidebar-spacer" />

        <div className="upgrade-card bg-none bg-indigo-950/80 border border-indigo-800/60 rounded-xl">
          <div className="gem-orbit bg-indigo-900/80 border border-indigo-400/30 text-indigo-200">
            <Gem size={19} />
          </div>
          <span className="text-indigo-200/70">DESBLOQUEIE SEU POTENCIAL</span>
          <strong className="text-white">Suba para o modo Pro</strong>
          <p className="text-indigo-200/70">
            Mentorias exclusivas e missões avançadas.
          </p>
          <button
            type="button"
            className="bg-none bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-lg shadow-sm active:scale-95 transition-all"
            onClick={() => onNotify("Plano Pro adicionado à sua lista")}
          >
            Conhecer o Pro <ChevronRight size={15} />
          </button>
        </div>

        <div className="profile bg-indigo-950/60 border border-indigo-800/50 rounded-xl">
          <div className="avatar avatar-main bg-none bg-[#6366F1] text-white">
            AC
            <span />
          </div>
          <div>
            <strong className="text-white">Alex Costa</strong>
            <span className="text-indigo-200/70">Fundador • Nível 7</span>
          </div>
          <button
            type="button"
            className="text-indigo-200/70 hover:text-white transition-colors"
            aria-label="Opções do perfil"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      {isOpen && (
        <button
          type="button"
          className="sidebar-backdrop bg-slate-900/40"
          onClick={onClose}
          aria-label="Fechar menu"
        />
      )}
    </>
  );
}
