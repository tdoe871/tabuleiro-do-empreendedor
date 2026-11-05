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
      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <LogoMark />
          <div>
            <strong>TABULEIRO</strong>
            <span>DO EMPREENDEDOR</span>
          </div>
          <button
            type="button"
            className="mobile-close"
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
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  setActiveNav(item.id);
                  onClose();
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge !== undefined && <em>{item.badge}</em>}
                {isActive && <i />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-section">
          <div className="section-heading">
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
                  className={`role ${isSelected ? "selected" : ""}`}
                  style={{ "--role-color": role.color } as CSSProperties}
                  onClick={() => onSelectRole(role.name)}
                >
                  <span className="role-icon">
                    <Icon size={17} />
                  </span>
                  <span>
                    <strong>{role.name}</strong>
                    <small>Nível {role.level}</small>
                  </span>
                  {isSelected && <Check size={14} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sidebar-spacer" />

        <div className="upgrade-card">
          <div className="gem-orbit">
            <Gem size={19} />
          </div>
          <span>DESBLOQUEIE SEU POTENCIAL</span>
          <strong>Suba para o modo Pro</strong>
          <p>Mentorias exclusivas e missões avançadas.</p>
          <button
            type="button"
            onClick={() => onNotify("Plano Pro adicionado à sua lista")}
          >
            Conhecer o Pro <ChevronRight size={15} />
          </button>
        </div>

        <div className="profile">
          <div className="avatar avatar-main">
            AC
            <span />
          </div>
          <div>
            <strong>Alex Costa</strong>
            <span>Fundador • Nível 7</span>
          </div>
          <button type="button" aria-label="Opções do perfil">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      {isOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={onClose}
          aria-label="Fechar menu"
        />
      )}
    </>
  );
}
