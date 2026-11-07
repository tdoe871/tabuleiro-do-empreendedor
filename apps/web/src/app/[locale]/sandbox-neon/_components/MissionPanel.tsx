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
    <div className="mission-panel">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">MISSÃO EM DESTAQUE</span>
          <h2>
            {selectedPhase.id === 2
              ? "Valide antes de construir"
              : `Avance em ${selectedPhase.title}`}
          </h2>
        </div>
        <div className="reward">
          <CircleDollarSign size={15} /> +240 XP
        </div>
      </div>

      <div className="mission-body">
        <ProgressRing value={selectedPhase.progress} />
        <div className="mission-copy">
          <span>DESAFIO PRINCIPAL</span>
          <h3>
            {selectedPhase.id === 2
              ? "Teste sua proposta com 5 pessoas"
              : `Complete a próxima etapa de ${selectedPhase.title}`}
          </h3>
          <p>
            Conduza conversas rápidas, registre os aprendizados e descubra quais
            hipóteses precisam evoluir.
          </p>
          <div className="mission-meta">
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
          className="mission-button"
          onClick={onOpenMission}
        >
          Abrir missão <ChevronRight size={17} />
        </button>
      </div>

      <div className="mission-footer">
        <div className="team-stack">
          <span style={{ background: "#9b8cff" }}>JM</span>
          <span style={{ background: "#50ddff" }}>RL</span>
          <span style={{ background: "#ff8b69" }}>BT</span>
        </div>
        <span>Seu esquadrão está nesta missão</span>
        <i />
        <span>
          <ShieldCheck size={14} /> Prazo: 3 dias
        </span>
      </div>
    </div>
  );
}
