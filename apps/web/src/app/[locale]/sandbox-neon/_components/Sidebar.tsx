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
        className={`sidebar bg-none bg-[#151B2B]/90 backdrop-blur-xl border-r border-white/5 text-slate-200 ${
          isOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="brand">
          <LogoMark />
          <div>
            <strong className="text-white">TABULEIRO</strong>
            <span className="text-slate-400">DO EMPREENDEDOR</span>
          </div>
          <button
            type="button"
            className="mobile-close bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all"
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
                className={`nav-item bg-none rounded-xl transition-all duration-300 ${
                  isActive
                    ? "active bg-[#1C2438] border border-white/10 text-white shadow-[0_0_15px_rgba(79,70,229,0.2)]"
                    : "text-slate-400 hover:bg-[#1C2438] hover:border-white/10 hover:text-white"
                }`}
                onClick={() => {
                  setActiveNav(item.id);
                  onClose();
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <em className="bg-[#4F46E5]/20 border border-[#6366F1]/40 text-[#818CF8]">
                    {item.badge}
                  </em>
                )}
                {isActive && (
                  <i className="bg-[#6366F1] shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-section">
          <div className="section-heading text-slate-500">
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
                  className={`role bg-none rounded-xl backdrop-blur-xl border transition-all duration-300 ${
                    isSelected
                      ? "selected bg-[#1C2438] border-white/15 text-white shadow-[0_0_15px_rgba(79,70,229,0.18)]"
                      : "bg-[#151B2B]/90 border-white/5 text-slate-300 hover:bg-[#1C2438] hover:border-white/10"
                  }`}
                  style={{ "--role-color": role.color } as CSSProperties}
                  onClick={() => onSelectRole(role.name)}
                >
                  <span className="role-icon">
                    <Icon size={17} />
                  </span>
                  <span>
                    <strong className="text-white">{role.name}</strong>
                    <small className="text-slate-400">Nível {role.level}</small>
                  </span>
                  {isSelected && <Check size={14} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sidebar-spacer" />

        <div className="upgrade-card bg-none bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10">
          <div className="gem-orbit bg-[#4F46E5]/20 border border-[#6366F1]/30 text-[#818CF8]">
            <Gem size={19} />
          </div>
          <span className="text-[#818CF8]">DESBLOQUEIE SEU POTENCIAL</span>
          <strong className="text-white">Suba para o modo Pro</strong>
          <p className="text-slate-400">
            Mentorias exclusivas e missões avançadas.
          </p>
          <button
            type="button"
            className="bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
            onClick={() => onNotify("Plano Pro adicionado à sua lista")}
          >
            Conhecer o Pro <ChevronRight size={15} />
          </button>
        </div>

        <div className="profile bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10">
          <div className="avatar avatar-main bg-none bg-[#4F46E5] text-white shadow-[0_0_12px_rgba(79,70,229,0.4)]">
            AC
            <span />
          </div>
          <div>
            <strong className="text-white">Alex Costa</strong>
            <span className="text-slate-400">Fundador • Nível 7</span>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Opções do perfil"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      {isOpen && (
        <button
          type="button"
          className="sidebar-backdrop bg-[#0B0F19]/80 backdrop-blur-sm"
          onClick={onClose}
          aria-label="Fechar menu"
        />
      )}
    </>
  );
}
