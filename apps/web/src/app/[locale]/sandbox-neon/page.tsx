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
    <div className="app-shell bg-none bg-[#0b1321] text-[#f1f6ff]">
      <div className="ambient ambient-one bg-[#8b9fff]/15" />
      <div className="ambient ambient-two bg-[#65dcd5]/12" />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeRole={activeRole}
        onSelectRole={setActiveRole}
        onNotify={notify}
      />

      <main className="workspace bg-[#0f1a2c] text-[#f1f6ff]" id="inicio">
        <TopNav
          onOpenSidebar={() => setSidebarOpen(true)}
          onExport={exportProgress}
          onNotify={notify}
        />

        <div className="content text-[#f1f6ff]">
          <section className="hero" id="jornada">
            <div className="hero-copy">
              <div className="eyebrow bg-[#202f54] border border-[#8b9fff]/50 text-[#8b9fff]">
                <Sparkles size={14} /> CAPÍTULO 2 • EM PROGRESSO
              </div>
              <h1 className="text-[#f1f6ff]">
                Construa algo que
                <br />
                <span className="bg-none text-[#8b9fff]">o mundo precisa.</span>
              </h1>
              <p className="text-[#9caec6]">
                Explore desafios, conquiste habilidades e transforme sua ideia
                em um negócio de impacto.
              </p>
            </div>

            <div
              className="level-card bg-none bg-[#121e30]/90 backdrop-blur-xl border border-[#2a3b52] rounded-2xl p-6 transition-all duration-300 hover:bg-[#1a2644] hover:border-[#8b9fff] hover:shadow-[0_0_22px_rgba(139,159,255,0.2)]"
              id="ranking"
            >
              <div className="level-top">
                <div className="level-badge bg-none bg-[#202f54] border border-[#8b9fff] text-[#f1f6ff] rounded-xl">
                  <Crown size={18} /> 07
                </div>
                <div>
                  <span className="text-[#9caec6]">NÍVEL ATUAL</span>
                  <strong className="text-[#f1f6ff]">Fundador Audaz</strong>
                </div>
                <Sparkles className="level-spark text-[#8b9fff]" size={22} />
              </div>
              <div className="xp-row text-[#9caec6]">
                <span className="text-[#f1f6ff] font-semibold">2.840 XP</span>
                <span className="text-[#9caec6]">3.500 XP</span>
              </div>
              <div className="xp-track bg-[#2a3b52] border border-[#2a3b52]">
                <span className="bg-none bg-[#8b9fff]" />
              </div>
              <small className="text-[#9caec6]">
                Mais <b className="text-[#f1f6ff]">660 XP</b> para o próximo
                nível
              </small>
            </div>
          </section>

          <section className="board-section">
            <div className="title-row">
              <div>
                <span className="section-kicker text-[#8b9fff]">
                  MAPA DA JORNADA
                </span>
                <h2 className="text-[#f1f6ff]">Escolha sua próxima missão</h2>
              </div>
              <div className="progress-summary bg-[#121e30]/90 backdrop-blur-xl border border-[#2a3b52] rounded-2xl transition-all duration-300 hover:bg-[#1a2644] hover:border-[#8b9fff] hover:shadow-[0_0_22px_rgba(139,159,255,0.2)]">
                <span className="text-[#9caec6]">Progresso geral</span>
                <strong className="text-[#f1f6ff]">48%</strong>
                <div className="bg-[#2a3b52]">
                  <i className="bg-none bg-[#8b9fff]" />
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

          <footer className="border-t border-[#2a3b52] text-[#9caec6]">
            <span className="text-[#9caec6]">
              Tabuleiro do Empreendedor © 2025
            </span>
            <div>
              <Link
                href="#ajuda"
                className="text-[#9caec6] hover:text-[#f1f6ff] transition-colors"
              >
                Central de ajuda
              </Link>
              <Link
                href="#feedback"
                className="text-[#9caec6] hover:text-[#f1f6ff] transition-colors"
              >
                Enviar feedback
              </Link>
            </div>
          </footer>
        </div>
      </main>

      {toast && (
        <div className="toast bg-none bg-[#121e30]/95 backdrop-blur-xl border border-[#8b9fff] rounded-2xl text-[#f1f6ff] shadow-[0_0_22px_rgba(139,159,255,0.25)]">
          <Check size={17} /> {toast}
        </div>
      )}
    </div>
  );
}
