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
    <div className="app-shell bg-none bg-[#0B0F19] text-slate-200">
      <div className="ambient ambient-one bg-[#4F46E5]/20" />
      <div className="ambient ambient-two bg-[#6366F1]/15" />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeRole={activeRole}
        onSelectRole={setActiveRole}
        onNotify={notify}
      />

      <main className="workspace bg-[#0B0F19] text-slate-200" id="inicio">
        <TopNav
          onOpenSidebar={() => setSidebarOpen(true)}
          onExport={exportProgress}
          onNotify={notify}
        />

        <div className="content text-slate-200">
          <section className="hero" id="jornada">
            <div className="hero-copy text-slate-400">
              <div className="eyebrow text-indigo-400">
                <Sparkles size={14} /> CAPÍTULO 2 • EM PROGRESSO
              </div>
              <h1>
                Construa algo que
                <br />
                <span>o mundo precisa.</span>
              </h1>
              <p>
                Explore desafios, conquiste habilidades e transforme sua ideia
                em um negócio de impacto.
              </p>
            </div>

            <div
              className="level-card bg-none bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10"
              id="ranking"
            >
              <div className="level-top text-white">
                <div className="level-badge bg-[#4F46E5]/15 border border-white/10 text-indigo-400">
                  <Crown size={18} /> 07
                </div>
                <div>
                  <span>NÍVEL ATUAL</span>
                  <strong>Fundador Audaz</strong>
                </div>
                <Sparkles className="level-spark text-indigo-400" size={22} />
              </div>
              <div className="xp-row text-slate-400">
                <span>2.840 XP</span>
                <span>3.500 XP</span>
              </div>
              <div className="xp-track bg-white/5">
                <span />
              </div>
              <small>
                Mais <b>660 XP</b> para o próximo nível
              </small>
            </div>
          </section>

          <section className="board-section">
            <div className="title-row text-white">
              <div>
                <span className="section-kicker text-slate-400">
                  MAPA DA JORNADA
                </span>
                <h2>Escolha sua próxima missão</h2>
              </div>
              <div className="progress-summary text-slate-400">
                <span>Progresso geral</span>
                <strong>48%</strong>
                <div>
                  <i />
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

          <footer>
            <span>Tabuleiro do Empreendedor © 2025</span>
            <div>
              <Link href="#ajuda">Central de ajuda</Link>
              <Link href="#feedback">Enviar feedback</Link>
            </div>
          </footer>
        </div>
      </main>

      {toast && (
        <div className="toast bg-[#151B2B]/90 backdrop-blur-xl border border-white/10 rounded-xl text-white">
          <Check size={17} /> {toast}
        </div>
      )}
    </div>
  );
}
