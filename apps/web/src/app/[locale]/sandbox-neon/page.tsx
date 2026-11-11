"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import { Sidebar } from "./_components/Sidebar";
import { TopNav } from "./_components/TopNav";
import { PHASES, PhaseCard, type PhaseData } from "./_components/PhaseCard";
import { MissionPanel } from "./_components/MissionPanel";
import { TeamChat } from "./_components/TeamChat";

export default function SandboxNeonPage() {
  const [activePhase, setActivePhase] = useState<number>(2);
  const [activeRole, setActiveRole] = useState<string>("Visionário");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string>("");
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const notify = useCallback((text: string) => {
    setToast(text);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
      toastTimerRef.current = null;
    }, 2400);
  }, []);

  const selectedPhase = useMemo(
    () => PHASES.find((phase) => phase.id === activePhase) ?? PHASES[0],
    [activePhase],
  );

  const handleSelectPhase = useCallback(
    (phase: PhaseData) => {
      if (phase.status === "locked") {
        notify("Complete 75% de Alianças para desbloquear");
        return;
      }
      setActivePhase(phase.id);
    },
    [notify],
  );

  const exportProgress = useCallback(() => {
    const content = JSON.stringify(
      {
        projeto: "Tabuleiro do Empreendedor",
        equipe: "Nova Era",
        nivel: 7,
        xp: 2840,
        faseAtual: selectedPhase.title,
        progresso: selectedPhase.progress,
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tabuleiro-progresso.json";
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Arquivo exportado com sucesso");
  }, [notify, selectedPhase]);

  return (
    <div className="app-shell bg-none bg-slate-50 text-slate-900">
      <div className="ambient ambient-one hidden" />
      <div className="ambient ambient-two hidden" />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeRole={activeRole}
        onSelectRole={setActiveRole}
        onNotify={notify}
      />

      <main className="workspace bg-slate-50 text-slate-900" id="inicio">
        <TopNav
          onOpenSidebar={() => setSidebarOpen(true)}
          onExport={exportProgress}
          onNotify={notify}
        />

        <div className="content text-slate-900">
          <section className="hero" id="jornada">
            <div className="hero-copy">
              <div className="eyebrow bg-indigo-50 border border-indigo-200 text-[#6366F1]">
                <Sparkles size={14} /> CAPÍTULO 2 • EM PROGRESSO
              </div>
              <h1 className="text-slate-900">
                Construa algo que
                <br />
                <span className="bg-none text-[#6366F1]">o mundo precisa.</span>
              </h1>
              <p className="text-slate-500">
                Explore desafios, conquiste habilidades e transforme sua ideia
                em um negócio de impacto.
              </p>
            </div>

            <div
              className="level-card bg-none bg-white border border-slate-200 rounded-xl shadow-sm p-6 transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5"
              id="ranking"
            >
              <div className="level-top">
                <div className="level-badge bg-none bg-[#6366F1] text-white shadow-sm">
                  <Crown size={18} /> 07
                </div>
                <div>
                  <span className="text-slate-500">NÍVEL ATUAL</span>
                  <strong className="text-slate-900">Fundador Audaz</strong>
                </div>
                <Sparkles className="level-spark text-[#6366F1]" size={22} />
              </div>
              <div className="xp-row text-slate-500">
                <span className="text-slate-900 font-semibold">2.840 XP</span>
                <span className="text-slate-500">3.500 XP</span>
              </div>
              <div className="xp-track bg-slate-200 border border-slate-200">
                <span className="bg-none bg-[#6366F1]" />
              </div>
              <small className="text-slate-500">
                Mais <b className="text-slate-900">660 XP</b> para o próximo
                nível
              </small>
            </div>
          </section>

          <section className="board-section">
            <div className="title-row">
              <div>
                <span className="section-kicker text-[#6366F1]">
                  MAPA DA JORNADA
                </span>
                <h2 className="text-slate-900">Escolha sua próxima missão</h2>
              </div>
              <div className="progress-summary bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5">
                <span className="text-slate-500">Progresso geral</span>
                <strong className="text-slate-900">48%</strong>
                <div className="bg-slate-200">
                  <i className="bg-none bg-[#6366F1]" />
                </div>
              </div>
            </div>

            <div className="phase-grid">
              {PHASES.map((phase) => (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  isActive={activePhase === phase.id}
                  onSelect={handleSelectPhase}
                />
              ))}
            </div>
          </section>

          <section className="lower-grid">
            <MissionPanel
              selectedPhase={selectedPhase}
              onOpenMission={() => notify("Missão aberta no seu tabuleiro")}
            />
            <TeamChat />
          </section>

          <footer className="border-t border-slate-200 text-slate-500">
            <span className="text-slate-500">
              Tabuleiro do Empreendedor © 2025
            </span>
            <div>
              <Link
                href="#ajuda"
                className="text-slate-500 hover:text-slate-900 transition-colors"
              >
                Central de ajuda
              </Link>
              <Link
                href="#feedback"
                className="text-slate-500 hover:text-slate-900 transition-colors"
              >
                Enviar feedback
              </Link>
            </div>
          </footer>
        </div>
      </main>

      {toast && (
        <div className="toast bg-none bg-white border border-slate-200 rounded-xl text-slate-900 shadow-md">
          <Check size={17} /> {toast}
        </div>
      )}
    </div>
  );
}
