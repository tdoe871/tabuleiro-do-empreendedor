"use client";

import type { CSSProperties } from "react";
import {
  Check,
  ChevronRight,
  Handshake,
  Lightbulb,
  LockKeyhole,
  Rocket,
  Search,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type PhaseStatus = "completed" | "active" | "locked";

export interface PhaseData {
  id: number;
  title: string;
  label: string;
  eyebrow: string;
  description: string;
  progress: number;
  status: PhaseStatus;
  xp: number;
  icon: LucideIcon;
  color: string;
  glow: string;
}

export const PHASES: readonly [PhaseData, ...PhaseData[]] = [
  {
    id: 1,
    title: "Problema",
    label: "Explorar",
    eyebrow: "Fase 01",
    description:
      "Investigue o mercado e transforme dores reais em uma tese poderosa.",
    progress: 100,
    status: "completed",
    xp: 640,
    icon: Search,
    color: "#f9ca4a",
    glow: "rgba(249, 202, 74, .28)",
  },
  {
    id: 2,
    title: "Solução",
    label: "Construir",
    eyebrow: "Fase 02",
    description:
      "Crie, valide e evolua uma solução que as pessoas realmente desejam.",
    progress: 68,
    status: "active",
    xp: 820,
    icon: Lightbulb,
    color: "#b7ff5a",
    glow: "rgba(183, 255, 90, .27)",
  },
  {
    id: 3,
    title: "Alianças",
    label: "Conectar",
    eyebrow: "Fase 03",
    description:
      "Monte seu time, encontre mentores e construa parcerias estratégicas.",
    progress: 24,
    status: "active",
    xp: 560,
    icon: Handshake,
    color: "#9b8cff",
    glow: "rgba(155, 140, 255, .28)",
  },
  {
    id: 4,
    title: "Oportunidades",
    label: "Escalar",
    eyebrow: "Fase 04",
    description:
      "Conquiste mercado, prepare seu pitch e desbloqueie novos horizontes.",
    progress: 0,
    status: "locked",
    xp: 1200,
    icon: Rocket,
    color: "#50ddff",
    glow: "rgba(80, 221, 255, .27)",
  },
];

export interface PhaseCardProps {
  phase: PhaseData;
  isActive: boolean;
  onSelect: (phase: PhaseData) => void;
}

export function PhaseCard({ phase, isActive, onSelect }: PhaseCardProps) {
  const Icon = phase.icon;
  const ctaLabel =
    phase.status === "completed"
      ? "Revisitar"
      : phase.status === "locked"
        ? "Bloqueado"
        : "Continuar";

  return (
    <button
      type="button"
      className={`phase-card bg-none bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10 ${
        isActive
          ? "phase-active !bg-[#1C2438] !border-[#6366F1]/50 shadow-[0_0_25px_rgba(79,70,229,0.22)]"
          : ""
      } ${phase.status === "locked" ? "phase-locked opacity-65" : ""}`}
      style={
        {
          "--accent": phase.color,
          "--glow": phase.glow,
        } as CSSProperties
      }
      onClick={() => onSelect(phase)}
    >
      <div className="phase-top">
        <div className="phase-number text-slate-400">
          {String(phase.id).padStart(2, "0")}
        </div>
        <div className="phase-icon">
          <Icon size={22} />
        </div>
        {phase.status === "completed" && (
          <span className="status-icon done">
            <Check size={14} />
          </span>
        )}
        {phase.status === "locked" && (
          <span className="status-icon">
            <LockKeyhole size={14} />
          </span>
        )}
      </div>

      <span className="phase-eyebrow text-slate-400">
        {phase.eyebrow} • {phase.label}
      </span>
      <h3 className="text-white">{phase.title}</h3>
      <p className="text-slate-400">{phase.description}</p>

      <div className="phase-progress">
        <div className="bg-[#0B0F19]">
          <i style={{ width: `${phase.progress}%` }} />
        </div>
        <span className="text-slate-400">{phase.progress}%</span>
      </div>

      <div className="phase-footer border-t border-white/5">
        <span>
          <Zap size={13} fill="currentColor" /> +{phase.xp} XP
        </span>
        <span className="phase-cta text-white">
          {ctaLabel}
          <ChevronRight size={15} />
        </span>
      </div>
    </button>
  );
}
