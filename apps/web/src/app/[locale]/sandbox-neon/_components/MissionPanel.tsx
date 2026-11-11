"use client";

import {
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import type { PhaseData } from "./PhaseCard";

interface ProgressRingProps {
  value: number;
}

function ProgressRing({ value }: ProgressRingProps) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle className="ring-track" cx="40" cy="40" r={radius} />
        <circle
          className="ring-value"
          cx="40"
          cy="40"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (value / 100) * circumference}
        />
      </svg>
      <strong>{value}%</strong>
    </div>
  );
}

export interface MissionPanelProps {
  selectedPhase: PhaseData;
  onOpenMission: () => void;
}

export function MissionPanel({
  selectedPhase,
  onOpenMission,
}: MissionPanelProps) {
  return (
    <div className="mission-panel bg-none bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10">
      <div className="panel-heading">
        <div>
          <span className="section-kicker text-[#818CF8]">
            MISSÃO EM DESTAQUE
          </span>
          <h2 className="text-white">
            {selectedPhase.id === 2
              ? "Valide antes de construir"
              : `Avance em ${selectedPhase.title}`}
          </h2>
        </div>
        <div className="reward bg-[#4F46E5]/15 border border-[#6366F1]/30 text-[#818CF8]">
          <CircleDollarSign size={15} /> +240 XP
        </div>
      </div>

      <div className="mission-body bg-[#0B0F19]/75 border border-white/5 rounded-xl transition-all duration-300 hover:border-white/10">
        <ProgressRing value={selectedPhase.progress} />
        <div className="mission-copy">
          <span className="text-[#65dcd5]">DESAFIO PRINCIPAL</span>
          <h3 className="text-white">
            {selectedPhase.id === 2
              ? "Teste sua proposta com 5 pessoas"
              : `Complete a próxima etapa de ${selectedPhase.title}`}
          </h3>
          <p className="text-slate-400">
            Conduza conversas rápidas, registre os aprendizados e descubra quais
            hipóteses precisam evoluir.
          </p>
          <div className="mission-meta text-slate-400">
            <span>
              <Users size={15} /> Em equipe
            </span>
            <span>
              <BriefcaseBusiness size={15} /> 3 entregáveis
            </span>
            <span>
              <TrendingUp size={15} /> Intermediário
            </span>
          </div>
        </div>
        <button
          type="button"
          className="mission-button bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          onClick={onOpenMission}
        >
          Abrir missão <ChevronRight size={17} />
        </button>
      </div>

      <div className="mission-footer text-slate-400">
        <div className="team-stack">
          <span style={{ background: "#9b8cff" }}>JM</span>
          <span style={{ background: "#50ddff" }}>RL</span>
          <span style={{ background: "#ff8b69" }}>BT</span>
        </div>
        <span className="text-slate-400">Seu esquadrão está nesta missão</span>
        <i />
        <span className="text-slate-400">
          <ShieldCheck size={14} /> Prazo: 3 dias
        </span>
      </div>
    </div>
  );
}
