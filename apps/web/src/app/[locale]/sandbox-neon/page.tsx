"use client";

import React, { useState } from "react";
import {
  Search,
  Lightbulb,
  Handshake,
  Rocket,
  Clock,
  Crown,
  Sparkles,
  Flame,
  Bell,
  CheckCircle2,
  Lock,
  ArrowRight,
  Upload,
  ExternalLink,
  GitBranch,
  FileText,
  Compass,
  Trophy,
  Users,
  LayoutDashboard,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  X,
} from "lucide-react";

// --- TIPOS Y DATOS DEL DOMINIO ---
type ChaveKey = "problem" | "solution" | "alliances" | "opportunities";

interface PhaseStep {
  id: number;
  title: string;
  desc: string;
  status: "completed" | "in-progress" | "locked";
  xp: number;
}

interface ChaveCardData {
  key: ChaveKey;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  progress: number;
  color: string;
  accentHex: string;
  borderHover: string;
  shadowGlow: string;
  badgeBg: string;
  icon: React.ElementType;
  steps: PhaseStep[];
}

const CHAVES_DATA: ChaveCardData[] = [
  {
    key: "problem",
    tag: "Fase 01 • Explorar",
    title: "Problem",
    subtitle: "Dores Reais do Mercado",
    description:
      "Identifique problemas reais, entreviste usuários e formule uma tese de valor clara e validada.",
    progress: 100,
    color: "#F9CA4A",
    accentHex: "text-[#F9CA4A]",
    borderHover: "hover:border-[#F9CA4A]/70",
    shadowGlow: "hover:shadow-[0_0_35px_-5px_rgba(249,202,74,0.30)]",
    badgeBg: "bg-[#F9CA4A]/10 text-[#F9CA4A] border-[#F9CA4A]/30",
    icon: Search,
    steps: [
      {
        id: 1,
        title: "Mapeamento do Território",
        desc: "Coleta de dados e pesquisa de campo",
        status: "completed",
        xp: 200,
      },
      {
        id: 2,
        title: "Entrevistas de Empatia",
        desc: "15 conversas estruturadas com usuários",
        status: "completed",
        xp: 220,
      },
      {
        id: 3,
        title: "Tese do Problema",
        desc: "Declaração de impacto do desafio central",
        status: "completed",
        xp: 220,
      },
    ],
  },
  {
    key: "solution",
    tag: "Fase 02 • Construir",
    title: "Solution",
    subtitle: "Proposta de Valor & MVP",
    description:
      "Construa o protótipo da solução, estabeleça o core loop e valide usabilidade com feedback real.",
    progress: 68,
    color: "#B7FF5A",
    accentHex: "text-[#B7FF5A]",
    borderHover: "hover:border-[#B7FF5A]/70",
    shadowGlow: "hover:shadow-[0_0_35px_-5px_rgba(183,255,90,0.32)]",
    badgeBg: "bg-[#B7FF5A]/10 text-[#B7FF5A] border-[#B7FF5A]/30",
    icon: Lightbulb,
    steps: [
      {
        id: 4,
        title: "Arquitetura da Solução",
        desc: "Definição técnica e fluxo funcional",
        status: "completed",
        xp: 260,
      },
      {
        id: 5,
        title: "Construção do Protótipo",
        desc: "MVP interativo funcional na web",
        status: "in-progress",
        xp: 300,
      },
      {
        id: 6,
        title: "Teste de Aderência",
        desc: "Feedback quantitativo de early adopters",
        status: "locked",
        xp: 260,
      },
    ],
  },
  {
    key: "alliances",
    tag: "Fase 03 • Conectar",
    title: "Alliances",
    subtitle: "Parcerias & Ecossistema",
    description:
      "Conecte mentores, estabeleça parceiros de distribuição e distribua papéis estratégicos.",
    progress: 25,
    color: "#9B8CFF",
    accentHex: "text-[#9B8CFF]",
    borderHover: "hover:border-[#9B8CFF]/70",
    shadowGlow: "hover:shadow-[0_0_35px_-5px_rgba(155,140,255,0.32)]",
    badgeBg: "bg-[#9B8CFF]/10 text-[#9B8CFF] border-[#9B8CFF]/30",
    icon: Handshake,
    steps: [
      {
        id: 7,
        title: "Matriz de Papéis RPG",
        desc: "Definição de sinergia entre integrantes",
        status: "completed",
        xp: 180,
      },
      {
        id: 8,
        title: "Rodada com Mentores",
        desc: "Sessão de bancada e refinamento",
        status: "in-progress",
        xp: 200,
      },
      {
        id: 9,
        title: "Acordos de Distribuição",
        desc: "Conexões estratégicas de canal",
        status: "locked",
        xp: 180,
      },
    ],
  },
  {
    key: "opportunities",
    tag: "Fase 04 • Escalar",
    title: "Opportunities",
    subtitle: "Modelo & Pitch Final",
    description:
      "Projete monetização sustentável, viabilidade de escala e prepare a apresentação definitiva.",
    progress: 0,
    color: "#50DDFF",
    accentHex: "text-[#50DDFF]",
    borderHover: "hover:border-[#50DDFF]/70",
    shadowGlow: "hover:shadow-[0_0_35px_-5px_rgba(80,221,255,0.30)]",
    badgeBg: "bg-[#50DDFF]/10 text-[#50DDFF] border-[#50DDFF]/30",
    icon: Rocket,
    steps: [
      {
        id: 10,
        title: "Modelo de Receita",
        desc: "Unit economics e precificação",
        status: "locked",
        xp: 400,
      },
      {
        id: 11,
        title: "Deck de Apresentação",
        desc: "Slides de alto impacto para banca",
        status: "locked",
        xp: 400,
      },
      {
        id: 12,
        title: "Pitch do Empreendedor",
        desc: "Demonstração e submissão final",
        status: "locked",
        xp: 400,
      },
    ],
  },
];

export default function PlayerBoard() {
  const [activeTab, setActiveTab] = useState<
    "tabuleiro" | "jornada" | "ranking" | "chat"
  >("tabuleiro");
  const [selectedChave, setSelectedChave] = useState<ChaveCardData | null>(
    null,
  );
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [submissionType, setSubmissionType] = useState<
    "deploy" | "repo" | "file"
  >("deploy");
  const [deployUrl, setDeployUrl] = useState(
    "https://team-raiz-prototype.vercel.app",
  );
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#08090D] text-white font-sans antialiased selection:bg-[#B7FF5A] selection:text-black">
      {/* GLOWS AMBIENTALES DE FONDO */}
      <div className="fixed top-[-100px] left-[-80px] w-[500px] h-[500px] bg-[#F9CA4A]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-[#9B8CFF]/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/3 w-[450px] h-[450px] bg-[#B7FF5A]/05 rounded-full blur-[180px] pointer-events-none" />

      {/* ─────────────────────────────────────────────────────────────
          1. BARRA LATERAL (SIDEBAR)
      ────────────────────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-white/10 bg-[#0D0E14]/80 backdrop-blur-2xl flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0BC40]/15 border border-[#F0BC40]/40 flex items-center justify-center shadow-[0_0_20px_-3px_rgba(240,188,64,0.4)]">
              <Sparkles className="w-5 h-5 text-[#F0BC40]" />
            </div>
            <div>
              <span className="block text-xs font-extrabold tracking-widest text-[#F0BC40] uppercase">
                Tabuleiro
              </span>
              <span className="block text-sm font-bold tracking-tight text-white/90">
                DO EMPREENDEDOR
              </span>
            </div>
          </div>

          {/* Navegación Principal */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab("tabuleiro")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "tabuleiro"
                  ? "bg-white/10 text-white shadow-inner border border-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard
                  className={`w-4 h-4 ${activeTab === "tabuleiro" ? "text-[#B7FF5A]" : ""}`}
                />
                <span>Meu Tabuleiro</span>
              </div>
              {activeTab === "tabuleiro" && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#B7FF5A]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("jornada")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "jornada"
                  ? "bg-white/10 text-white shadow-inner border border-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <Compass className="w-4 h-4" />
                <span>Jornada & Fases</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/80">
                12
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ranking")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "ranking"
                  ? "bg-white/10 text-white shadow-inner border border-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <Trophy className="w-4 h-4 text-[#F9CA4A]" />
                <span>Ranking Geral</span>
              </div>
              <span className="text-xs font-bold text-[#F9CA4A]">#3</span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "chat"
                  ? "bg-white/10 text-white shadow-inner border border-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                <span>Canal do Time</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#50DDFF]" />
            </button>
          </nav>
        </div>

        {/* Tarjeta inferior del Equipo */}
        <div className="p-4 m-3 rounded-2xl bg-[#14161C]/90 border border-white/10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-wider uppercase text-white/40">
              Sua Equipe
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#B7FF5A]/20 text-[#B7FF5A] border border-[#B7FF5A]/30">
              Líder
            </span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1A9055] to-[#0FD4B0] flex items-center justify-center font-bold text-base shadow-md">
              TR
            </div>
            <div>
              <h4 className="text-sm font-bold leading-tight">Team Raiz</h4>
              <p className="text-[11px] text-white/50">4 Empreendedores</p>
            </div>
          </div>

          {/* Micro Stack de Roles */}
          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/05 text-[10px] text-white/70">
            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
              <span>🩺</span>
              <span className="truncate">Saúde</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
              <span>🚀</span>
              <span className="truncate">Inovação</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. ÁREA PRINCIPAL + HEADER
      ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* HEADER SUPERIOR */}
        <header className="h-24 px-8 border-b border-white/10 bg-[#08090D]/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Good morning, Team Raiz
              </h1>
              <span className="inline-block animate-pulse text-lg">🌱</span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Temporada 02 • Hackathon de Empreendedorismo de Impacto
            </p>
          </div>

          {/* Badges de Estado y Acciones Rápidas */}
          <div className="flex items-center gap-4">
            {/* Timer Global */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#14161C]/90 border border-white/10 shadow-sm">
              <Clock className="w-4 h-4 text-[#F9CA4A] animate-spin-slow" />
              <div>
                <span className="block text-[9px] font-bold text-white/40 uppercase tracking-wider">
                  Tempo Restante
                </span>
                <span className="block text-sm font-mono font-bold text-white">
                  03:42:18
                </span>
              </div>
            </div>

            {/* XP & Nivel */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#14161C]/90 border border-white/10 shadow-sm">
              <Crown className="w-4 h-4 text-[#B7FF5A]" />
              <div>
                <span className="block text-[9px] font-bold text-white/40 uppercase tracking-wider">
                  Nível 07
                </span>
                <span className="block text-sm font-bold text-[#B7FF5A]">
                  2,840 XP
                </span>
              </div>
            </div>

            {/* Botón de Entrega de Proyecto */}
            <button
              onClick={() => setIsSubmissionOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B7FF5A] to-[#0FD4B0] text-black font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-[0_0_25px_-5px_rgba(183,255,90,0.4)] cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>
                {submitted ? "Entrega Atualizada" : "Entregar Projeto"}
              </span>
            </button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            3. GRID PRINCIPAL (4 TARJETAS GLASSMORPHISM RESKIN)
        ────────────────────────────────────────────────────────────── */}
        <div className="p-8 space-y-6">
          {/* Banner de Estado Resumen */}
          <div className="p-5 rounded-2xl bg-[#14161C]/80 backdrop-blur-2xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#B7FF5A]">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Progresso da Jornada do Tabuleiro
                </h3>
                <p className="text-xs text-white/50">
                  Você concluiu 1 das 4 Chaves mestras. Fase ativa no momento:
                  Solução.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="block text-xs font-bold text-white/40 uppercase">
                  Avanço Global
                </span>
                <span className="text-lg font-mono font-bold text-[#B7FF5A]">
                  48%
                </span>
              </div>
              <div className="w-32 h-2.5 rounded-full bg-white/5 overflow-hidden border border-white/10 p-0.5">
                <div className="h-full rounded-full bg-gradient-to-r from-[#F9CA4A] via-[#B7FF5A] to-[#9B8CFF] w-[48%]" />
              </div>
            </div>
          </div>

          {/* GRID DE LAS 4 CHAVES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CHAVES_DATA.map((chave) => {
              const Icon = chave.icon;
              const isLocked = chave.progress === 0;

              return (
                <div
                  key={chave.key}
                  onClick={() => setSelectedChave(chave)}
                  className={`group relative rounded-3xl p-7 bg-[#14161C]/80 backdrop-blur-2xl border border-white/10 transition-all duration-300 cursor-pointer flex flex-col justify-between ${chave.borderHover} ${chave.shadowGlow} hover:-translate-y-1`}
                >
                  {/* Luz ambiental interna al pasar el cursor */}
                  <div
                    className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: `${chave.color}20` }}
                  />

                  {/* Cabecera de la Tarjeta */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${chave.badgeBg}`}
                      >
                        {chave.tag}
                      </span>
                      <div
                        className="flex items-center gap-1.5 font-mono text-xs font-bold"
                        style={{ color: chave.color }}
                      >
                        <span>{chave.progress}%</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 mb-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300"
                        style={{
                          backgroundColor: `${chave.color}15`,
                          borderColor: `${chave.color}40`,
                        }}
                      >
                        <Icon
                          className="w-6 h-6"
                          style={{ color: chave.color }}
                        />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-white group-hover:text-white transition-colors">
                          {chave.title}
                        </h2>
                        <h3 className="text-xs font-medium text-white/50">
                          {chave.subtitle}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-white/60 leading-relaxed mb-6">
                      {chave.description}
                    </p>

                    {/* Pasos / Subfases de la Chave */}
                    <div className="space-y-2 mb-6">
                      {chave.steps.map((step, idx) => (
                        <div
                          key={step.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/05 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            {step.status === "completed" ? (
                              <CheckCircle2 className="w-4 h-4 text-[#22C97A]" />
                            ) : step.status === "in-progress" ? (
                              <div
                                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                                style={{
                                  borderColor: chave.color,
                                  borderTopColor: "transparent",
                                }}
                              />
                            ) : (
                              <Lock className="w-4 h-4 text-white/20" />
                            )}
                            <span
                              className={
                                step.status === "locked"
                                  ? "text-white/40"
                                  : "text-white/90 font-medium"
                              }
                            >
                              {idx + 1}. {step.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-white/40">
                            +{step.xp} XP
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Barra de Progreso y Call to Action */}
                  <div className="pt-4 border-t border-white/05 flex items-center justify-between">
                    <div className="w-1/2 h-1.5 rounded-full bg-white/5 overflow-hidden border border-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${chave.progress}%`,
                          backgroundColor: chave.color,
                          boxShadow: `0 0 12px ${chave.color}`,
                        }}
                      />
                    </div>

                    <div
                      className="flex items-center gap-1 text-xs font-bold group-hover:translate-x-1 transition-transform"
                      style={{ color: chave.color }}
                    >
                      <span>
                        {isLocked ? "Ver Requisitos" : "Explorar Desafios"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          4. MODAL: DETALLES DE FASE / CARTA DESAFIO
      ────────────────────────────────────────────────────────────── */}
      {selectedChave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl bg-[#14161C] border border-white/10 p-7 relative shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedChave(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${selectedChave.badgeBg}`}
              >
                {selectedChave.tag}
              </span>
              <span className="text-xs font-mono text-white/40">
                {selectedChave.progress}% Concluído
              </span>
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-1">
              {selectedChave.title}
            </h2>
            <p className="text-xs text-white/50 mb-6">
              {selectedChave.subtitle}
            </p>

            <div className="space-y-3 mb-6">
              {selectedChave.steps.map((st, i) => (
                <div
                  key={st.id}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/05 flex items-start gap-3"
                >
                  <div className="mt-0.5">
                    {st.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-[#22C97A]" />
                    ) : st.status === "in-progress" ? (
                      <div className="w-4 h-4 rounded-full border-2 border-[#B7FF5A] border-t-transparent animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4 text-white/20" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white/90">
                        {i + 1}. {st.title}
                      </h4>
                      <span className="text-[10px] font-mono text-white/40">
                        +{st.xp} XP
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      {st.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedChave(null)}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Continuar Missão
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL: ENTREGA DE PROJETO (SUBMISSION RESKIN)
      ────────────────────────────────────────────────────────────── */}
      {isSubmissionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#14161C] border border-white/15 p-8 relative shadow-[0_0_60px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsSubmissionOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#B7FF5A]/10 border border-[#B7FF5A]/30 flex items-center justify-center text-[#B7FF5A]">
                <Upload className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-extrabold text-white">
                Entrega do Projeto
              </h2>
            </div>
            <p className="text-xs text-white/50 mb-6">
              Disponibilize o link funcional da sua solução para avaliação da
              banca examinadora.
            </p>

            {/* Selector de Tipo */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                type="button"
                onClick={() => setSubmissionType("deploy")}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  submissionType === "deploy"
                    ? "bg-[#B7FF5A]/10 border-[#B7FF5A] text-white shadow-[0_0_20px_-5px_rgba(183,255,90,0.3)]"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>Deploy Web</span>
              </button>

              <button
                type="button"
                onClick={() => setSubmissionType("repo")}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  submissionType === "repo"
                    ? "bg-[#9B8CFF]/10 border-[#9B8CFF] text-white shadow-[0_0_20px_-5px_rgba(155,140,255,0.3)]"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                }`}
              >
                <GitBranch className="w-4 h-4" />
                <span>Repositório</span>
              </button>

              <button
                type="button"
                onClick={() => setSubmissionType("file")}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  submissionType === "file"
                    ? "bg-[#50DDFF]/10 border-[#50DDFF] text-white shadow-[0_0_20px_-5px_rgba(80,221,255,0.3)]"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>PDF / Pitch</span>
              </button>
            </div>

            {/* Input URL */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold text-white/70">
                {submissionType === "deploy"
                  ? "URL de Produção (Vercel / Netlify)"
                  : submissionType === "repo"
                    ? "Link do Repositório GitHub"
                    : "Link da Apresentação (Figma / Drive)"}
              </label>
              <input
                type="url"
                value={deployUrl}
                onChange={(e) => setDeployUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#B7FF5A] focus:ring-1 focus:ring-[#B7FF5A] transition-all"
              />
            </div>

            {/* Botón Salvar */}
            <button
              onClick={() => {
                setSubmitted(true);
                setIsSubmissionOpen(false);
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#B7FF5A] to-[#0FD4B0] text-black font-extrabold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-[0_0_25px_-5px_rgba(183,255,90,0.4)] cursor-pointer"
            >
              Confirmar Entrega do Team Raiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
