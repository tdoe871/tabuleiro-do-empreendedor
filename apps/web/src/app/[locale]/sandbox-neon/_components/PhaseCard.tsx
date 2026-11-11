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
      className={`phase-card relative overflow-hidden bg-none bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5 ${
        isActive
          ? "phase-active !border-[#6366F1] ring-2 ring-[#6366F1]/15"
          : ""
      } ${phase.status === "locked" ? "phase-locked opacity-75" : ""}`}
      style={
        {
          "--accent": phase.color,
          "--glow": phase.glow,
        } as CSSProperties
      }
      onClick={() => onSelect(phase)}
    >
      <img
        src={`/isometric/stage-${phase.id}.png`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-7 h-[96px] w-[114px] object-contain select-none"
      />
      <div className="phase-top">
        <div className="phase-number text-slate-500">
          {String(phase.id).padStart(2, "0")}
        </div>
        <div className="phase-icon bg-slate-100 border border-slate-200 text-[#6366F1]">
          <Icon size={22} />
        </div>
        {phase.status === "completed" && (
          <span className="status-icon done">
            <Check size={14} />
          </span>
        )}
        {phase.status === "locked" && (
          <span className="status-icon text-slate-400">
            <LockKeyhole size={14} />
          </span>
        )}
      </div>

      <span className="phase-eyebrow text-slate-500">
        {phase.eyebrow} • {phase.label}
      </span>
      <h3 className="text-slate-900">{phase.title}</h3>
      <p className="text-slate-500 pr-20">{phase.description}</p>

      <div className="phase-progress">
        <div className="bg-slate-200">
          <i
            className="bg-none bg-[#6366F1]"
            style={{ width: `${phase.progress}%` }}
          />
        </div>
        <span className="text-slate-500">{phase.progress}%</span>
      </div>

      <div className="phase-footer border-t border-slate-200">
        <span className="text-slate-500">
          <Zap size={13} fill="currentColor" /> +{phase.xp} XP
        </span>
        <span
          className={`phase-cta ${
            isActive
              ? "bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-lg px-3 py-1.5 shadow-sm active:scale-95 transition-all"
              : "text-slate-900 font-semibold"
          }`}
        >
          {ctaLabel}
          <ChevronRight size={15} />
        </span>
      </div>
    </button>
  );
}
