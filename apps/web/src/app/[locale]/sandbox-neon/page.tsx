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
  CheckCircle2,
  Lock,
  ArrowRight,
  Upload,
  ExternalLink,
  GitBranch,
  FileText,
  Compass,
  Trophy,
  LayoutDashboard,
  MessageSquare,
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
    color: "#2DD4BF",
    accentHex: "text-[#2DD4BF]",
    borderHover: "hover:border-[#2DD4BF]/80",
    shadowGlow: "hover:shadow-[0_16px_42px_-8px_rgba(45,212,191,0.38)]",
    badgeBg: "bg-[#2DD4BF]/15 text-[#2DD4BF] border-[#2DD4BF]/40",
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
    color: "#00F5D4",
    accentHex: "text-[#00F5D4]",
    borderHover: "hover:border-[#00F5D4]/80",
    shadowGlow: "hover:shadow-[0_16px_42px_-8px_rgba(0,245,212,0.42)]",
    badgeBg: "bg-[#00F5D4]/15 text-[#00F5D4] border-[#00F5D4]/40",
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
    color: "#38BDF8",
    accentHex: "text-[#38BDF8]",
    borderHover: "hover:border-[#38BDF8]/80",
    shadowGlow: "hover:shadow-[0_16px_42px_-8px_rgba(56,189,248,0.38)]",
    badgeBg: "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/40",
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
    color: "#00BBF9",
    accentHex: "text-[#00BBF9]",
    borderHover: "hover:border-[#00BBF9]/80",
    shadowGlow: "hover:shadow-[0_16px_42px_-8px_rgba(0,187,249,0.38)]",
    badgeBg: "bg-[#00BBF9]/15 text-[#00BBF9] border-[#00BBF9]/40",
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

const TEAM_ROLES = [
  {
    name: "Strategist",
    icon: "🧭",
    colorVar: "var(--ag-color-avatar-strategist, #00f5d4)",
  },
  {
    name: "Researcher",
    icon: "🔬",
    colorVar: "var(--ag-color-avatar-researcher, #00bbf9)",
  },
  {
    name: "Builder",
    icon: "🛠️",
    colorVar: "var(--ag-color-avatar-builder, #2dd4bf)",
  },
  {
    name: "Connector",
    icon: "🤝",
    colorVar: "var(--ag-color-avatar-connector, #38bdf8)",
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
    <div
      className="flex min-h-screen font-sans antialiased selection:bg-[#00F5D4] selection:text-[#031924]"
      style={{
        backgroundColor: "var(--ag-color-background, #04151f)",
        color: "var(--ag-color-text, #ecfeff)",
      }}
    >
      {/* GLOWS AMBIENTALES TURQUESA INTERACTIVOS */}
      <div className="fixed top-[-120px] left-[-80px] w-[520px] h-[520px] bg-[#00F5D4]/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-120px] right-[-100px] w-[580px] h-[580px] bg-[#00BBF9]/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed top-1/3 left-1/3 w-[440px] h-[440px] bg-[#2DD4BF]/10 rounded-full blur-[180px] pointer-events-none" />

      {/* ─────────────────────────────────────────────────────────────
          1. BARRA LATERAL (SIDEBAR)
      ────────────────────────────────────────────────────────────── */}
      <aside
        className="w-64 border-r backdrop-blur-2xl flex flex-col justify-between shrink-0 z-20"
        style={{
          backgroundColor: "var(--ag-color-sidebar, rgba(6, 26, 38, 0.90))",
          borderColor: "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
        }}
      >
        <div>
          {/* Logo Brand */}
          <div
            className="p-6 border-b flex items-center gap-3"
            style={{
              borderColor: "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
            }}
          >
            <div
              className="w-10 h-10 flex items-center justify-center border shadow-[0_0_24px_-4px_rgba(0,245,212,0.45)] transition-transform duration-300 hover:scale-105"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                backgroundColor: "rgba(0, 245, 212, 0.14)",
                borderColor: "rgba(0, 245, 212, 0.45)",
                color: "var(--ag-color-accent, #00f5d4)",
              }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span
                className="block text-xs font-extrabold tracking-widest uppercase"
                style={{ color: "var(--ag-color-accent, #00f5d4)" }}
              >
                Tabuleiro
              </span>
              <span
                className="block text-sm font-bold tracking-tight"
                style={{ color: "var(--ag-color-text, #ecfeff)" }}
              >
                DO EMPREENDEDOR
              </span>
            </div>
          </div>

          {/* Navegación Principal */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab("tabuleiro")}
              className="w-full flex items-center justify-between px-3.5 py-3 text-sm font-semibold transition-all duration-200 border hover:translate-x-1 cursor-pointer"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                backgroundColor:
                  activeTab === "tabuleiro"
                    ? "var(--ag-color-surface-selected, rgba(0, 245, 212, 0.18))"
                    : "transparent",
                borderColor:
                  activeTab === "tabuleiro"
                    ? "rgba(0, 245, 212, 0.45)"
                    : "transparent",
                color:
                  activeTab === "tabuleiro"
                    ? "var(--ag-color-text, #ecfeff)"
                    : "var(--ag-color-text-muted, #88d4e3)",
              }}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard
                  className="w-4 h-4"
                  style={{
                    color:
                      activeTab === "tabuleiro"
                        ? "var(--ag-color-accent, #00f5d4)"
                        : undefined,
                  }}
                />
                <span>Meu Tabuleiro</span>
              </div>
              {activeTab === "tabuleiro" && (
                <div
                  className="w-2 h-2 rounded-full shadow-[0_0_10px_#00F5D4]"
                  style={{
                    backgroundColor: "var(--ag-color-accent, #00f5d4)",
                  }}
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab("jornada")}
              className="w-full flex items-center justify-between px-3.5 py-3 text-sm font-semibold transition-all duration-200 border hover:translate-x-1 cursor-pointer"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                backgroundColor:
                  activeTab === "jornada"
                    ? "var(--ag-color-surface-selected, rgba(0, 245, 212, 0.18))"
                    : "transparent",
                borderColor:
                  activeTab === "jornada"
                    ? "rgba(0, 245, 212, 0.45)"
                    : "transparent",
                color:
                  activeTab === "jornada"
                    ? "var(--ag-color-text, #ecfeff)"
                    : "var(--ag-color-text-muted, #88d4e3)",
              }}
            >
              <div className="flex items-center gap-3">
                <Compass className="w-4 h-4" />
                <span>Jornada & Fases</span>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5"
                style={{
                  borderRadius: "var(--ag-radius-pill, 999px)",
                  backgroundColor: "rgba(0, 245, 212, 0.15)",
                  color: "var(--ag-color-accent, #00f5d4)",
                }}
              >
                12
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ranking")}
              className="w-full flex items-center justify-between px-3.5 py-3 text-sm font-semibold transition-all duration-200 border hover:translate-x-1 cursor-pointer"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                backgroundColor:
                  activeTab === "ranking"
                    ? "var(--ag-color-surface-selected, rgba(0, 245, 212, 0.18))"
                    : "transparent",
                borderColor:
                  activeTab === "ranking"
                    ? "rgba(0, 245, 212, 0.45)"
                    : "transparent",
                color:
                  activeTab === "ranking"
                    ? "var(--ag-color-text, #ecfeff)"
                    : "var(--ag-color-text-muted, #88d4e3)",
              }}
            >
              <div className="flex items-center gap-3">
                <Trophy
                  className="w-4 h-4"
                  style={{ color: "var(--ag-color-warning, #fbbf24)" }}
                />
                <span>Ranking Geral</span>
              </div>
              <span
                className="text-xs font-bold"
                style={{ color: "var(--ag-color-warning, #fbbf24)" }}
              >
                #3
              </span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className="w-full flex items-center justify-between px-3.5 py-3 text-sm font-semibold transition-all duration-200 border hover:translate-x-1 cursor-pointer"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                backgroundColor:
                  activeTab === "chat"
                    ? "var(--ag-color-surface-selected, rgba(0, 245, 212, 0.18))"
                    : "transparent",
                borderColor:
                  activeTab === "chat"
                    ? "rgba(0, 245, 212, 0.45)"
                    : "transparent",
                color:
                  activeTab === "chat"
                    ? "var(--ag-color-text, #ecfeff)"
                    : "var(--ag-color-text-muted, #88d4e3)",
              }}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                <span>Canal do Time</span>
              </div>
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--ag-color-accent, #00f5d4)" }}
              />
            </button>
          </nav>
        </div>

        {/* Tarjeta inferior del Equipo */}
        <div
          className="p-4 m-3 border backdrop-blur-xl transition-all duration-300 hover:border-[#00F5D4]/50"
          style={{
            borderRadius: "var(--ag-radius-card, 20px)",
            backgroundColor:
              "var(--ag-color-surface-featured, rgba(14, 48, 66, 0.88))",
            borderColor: "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[10px] font-bold tracking-wider uppercase"
              style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
            >
              Sua Equipe
            </span>
            <span
              className="text-[10px] font-bold px-2.5 py-0.5 border"
              style={{
                borderRadius: "var(--ag-radius-pill, 999px)",
                backgroundColor: "rgba(0, 245, 212, 0.16)",
                color: "var(--ag-color-accent, #00f5d4)",
                borderColor: "rgba(0, 245, 212, 0.4)",
              }}
            >
              Líder
            </span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 flex items-center justify-center font-extrabold text-base shadow-[0_0_18px_rgba(0,245,212,0.35)]"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                background:
                  "linear-gradient(135deg, var(--ag-color-accent, #00f5d4), var(--ag-color-info, #00bbf9))",
                color: "var(--ag-color-on-accent, #031924)",
              }}
            >
              TR
            </div>
            <div>
              <h4
                className="text-sm font-bold leading-tight"
                style={{ color: "var(--ag-color-text, #ecfeff)" }}
              >
                Team Raiz
              </h4>
              <p
                className="text-[11px]"
                style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
              >
                4 Empreendedores
              </p>
            </div>
          </div>

          {/* Micro Stack de Roles con Avatares Turquesa */}
          <div
            className="grid grid-cols-2 gap-1.5 pt-2 border-t text-[10px]"
            style={{
              borderColor: "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
            }}
          >
            {TEAM_ROLES.map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-1.5 px-2 py-1 font-semibold transition-transform hover:scale-105"
                style={{
                  borderRadius: "var(--ag-radius-control, 12px)",
                  backgroundColor: "var(--ag-color-surface-solid, #0c2d40)",
                  color: r.colorVar,
                  border:
                    "1px solid var(--ag-color-border, rgba(45, 212, 191, 0.24))",
                }}
              >
                <span>{r.icon}</span>
                <span className="truncate">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. ÁREA PRINCIPAL + HEADER
      ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto z-10">
        {/* HEADER SUPERIOR */}
        <header
          className="h-24 px-8 border-b backdrop-blur-2xl flex items-center justify-between sticky top-0 z-10"
          style={{
            backgroundColor: "var(--ag-color-sidebar, rgba(6, 26, 38, 0.88))",
            borderColor: "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-extrabold tracking-tight"
                style={{ color: "var(--ag-color-text, #ecfeff)" }}
              >
                Good morning, Team Raiz
              </h1>
              <span className="inline-block animate-pulse text-lg">🌊</span>
            </div>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
            >
              Temporada 02 • Hackathon de Empreendedorismo de Impacto
            </p>
          </div>

          {/* Badges de Estado y Acciones Rápidas */}
          <div className="flex items-center gap-4">
            {/* Timer Global */}
            <div
              className="flex items-center gap-2.5 px-4 py-2 border backdrop-blur-xl transition-transform hover:-translate-y-0.5"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                backgroundColor:
                  "var(--ag-color-surface-featured, rgba(14, 48, 66, 0.88))",
                borderColor: "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
              }}
            >
              <Clock
                className="w-4 h-4"
                style={{ color: "var(--ag-color-accent, #00f5d4)" }}
              />
              <div>
                <span
                  className="block text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
                >
                  Tempo Restante
                </span>
                <span
                  className="block text-sm font-mono font-bold"
                  style={{ color: "var(--ag-color-text, #ecfeff)" }}
                >
                  03:42:18
                </span>
              </div>
            </div>

            {/* XP & Nivel */}
            <div
              className="flex items-center gap-2.5 px-4 py-2 border backdrop-blur-xl transition-transform hover:-translate-y-0.5"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                backgroundColor:
                  "var(--ag-color-surface-featured, rgba(14, 48, 66, 0.88))",
                borderColor: "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
              }}
            >
              <Crown
                className="w-4 h-4"
                style={{ color: "var(--ag-color-accent, #00f5d4)" }}
              />
              <div>
                <span
                  className="block text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
                >
                  Nível 07
                </span>
                <span
                  className="block text-sm font-bold"
                  style={{ color: "var(--ag-color-accent, #00f5d4)" }}
                >
                  2,840 XP
                </span>
              </div>
            </div>

            {/* Botón de Entrega de Proyecto */}
            <button
              onClick={() => setIsSubmissionOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 font-extrabold text-xs uppercase tracking-wider hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                background:
                  "linear-gradient(135deg, var(--ag-color-accent, #00f5d4), var(--ag-color-info, #00bbf9))",
                color: "var(--ag-color-on-accent, #031924)",
                boxShadow:
                  "0 0 28px -4px var(--ag-color-selection-glow, rgba(0,245,212,0.55))",
              }}
            >
              <Upload className="w-4 h-4" />
              <span>
                {submitted ? "Entrega Atualizada" : "Entregar Projeto"}
              </span>
            </button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            3. GRID PRINCIPAL (4 TARJETAS TURQUOISE GLASS INTERACTIVAS)
        ────────────────────────────────────────────────────────────── */}
        <div className="p-8 space-y-6">
          {/* Banner de Estado Resumen */}
          <div
            className="p-5 border backdrop-blur-2xl flex items-center justify-between transition-all duration-300 hover:border-[#00F5D4]/50"
            style={{
              borderRadius: "var(--ag-radius-card, 20px)",
              backgroundColor:
                "var(--ag-color-surface, rgba(10, 38, 54, 0.78))",
              borderColor: "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
              boxShadow:
                "0 12px 32px -10px var(--ag-color-shadow, rgba(0,245,212,0.20))",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 border flex items-center justify-center shadow-[0_0_20px_-4px_rgba(0,245,212,0.4)]"
                style={{
                  borderRadius: "var(--ag-radius-control, 12px)",
                  backgroundColor: "rgba(0, 245, 212, 0.14)",
                  borderColor: "rgba(0, 245, 212, 0.4)",
                  color: "var(--ag-color-accent, #00f5d4)",
                }}
              >
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3
                  className="text-base font-bold"
                  style={{ color: "var(--ag-color-text, #ecfeff)" }}
                >
                  Progresso da Jornada do Tabuleiro
                </h3>
                <p
                  className="text-xs"
                  style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
                >
                  Você concluiu 1 das 4 Chaves mestras. Fase ativa no momento:
                  Solução.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span
                  className="block text-xs font-bold uppercase"
                  style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
                >
                  Avanço Global
                </span>
                <span
                  className="text-lg font-mono font-bold"
                  style={{ color: "var(--ag-color-accent, #00f5d4)" }}
                >
                  48%
                </span>
              </div>
              <div
                className="w-32 h-2.5 overflow-hidden border p-0.5"
                style={{
                  borderRadius: "var(--ag-radius-pill, 999px)",
                  backgroundColor: "var(--ag-color-surface-solid, #0c2d40)",
                  borderColor:
                    "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
                }}
              >
                <div
                  className="h-full w-[48%] shadow-[0_0_12px_#00F5D4]"
                  style={{
                    borderRadius: "var(--ag-radius-pill, 999px)",
                    background:
                      "linear-gradient(90deg, #2DD4BF, #00F5D4, #00BBF9)",
                  }}
                />
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
                  className={`group relative overflow-hidden p-7 border backdrop-blur-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between ${chave.borderHover} ${chave.shadowGlow} hover:-translate-y-1.5`}
                  style={{
                    borderRadius: "var(--ag-radius-card, 20px)",
                    backgroundColor:
                      "var(--ag-color-surface, rgba(10, 38, 54, 0.78))",
                    borderColor:
                      "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
                  }}
                >
                  {/* Luz ambiental turquesa al pasar el cursor */}
                  <div
                    className="absolute -top-14 -right-14 w-44 h-44 rounded-full blur-[70px] pointer-events-none opacity-20 group-hover:opacity-60 transition-opacity duration-300"
                    style={{ backgroundColor: chave.color }}
                  />

                  {/* Cabecera de la Tarjeta */}
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-[11px] font-bold px-3 py-1 uppercase tracking-wider border ${chave.badgeBg}`}
                        style={{
                          borderRadius: "var(--ag-radius-pill, 999px)",
                        }}
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
                        className="w-12 h-12 flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110"
                        style={{
                          borderRadius: "var(--ag-radius-control, 12px)",
                          backgroundColor: `${chave.color}1F`,
                          borderColor: `${chave.color}55`,
                          boxShadow: `0 0 20px -4px ${chave.color}55`,
                        }}
                      >
                        <Icon
                          className="w-6 h-6"
                          style={{ color: chave.color }}
                        />
                      </div>
                      <div>
                        <h2
                          className="text-xl font-bold tracking-tight"
                          style={{ color: "var(--ag-color-text, #ecfeff)" }}
                        >
                          {chave.title}
                        </h2>
                        <h3
                          className="text-xs font-semibold"
                          style={{
                            color: "var(--ag-color-text-muted, #88d4e3)",
                          }}
                        >
                          {chave.subtitle}
                        </h3>
                      </div>
                    </div>

                    <p
                      className="text-xs leading-relaxed mb-6"
                      style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
                    >
                      {chave.description}
                    </p>

                    {/* Pasos / Subfases de la Chave */}
                    <div className="space-y-2 mb-6">
                      {chave.steps.map((step, idx) => (
                        <div
                          key={step.id}
                          className="flex items-center justify-between p-2.5 border text-xs transition-all duration-200 group-hover:border-[#2DD4BF]/35"
                          style={{
                            borderRadius: "var(--ag-radius-control, 12px)",
                            backgroundColor:
                              step.status === "completed"
                                ? "var(--ag-color-surface-selected, rgba(0, 245, 212, 0.18))"
                                : step.status === "in-progress"
                                  ? "var(--ag-color-surface-interactive, #113c54)"
                                  : "var(--ag-color-surface-solid, #0c2d40)",
                            borderColor:
                              "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            {step.status === "completed" ? (
                              <CheckCircle2
                                className="w-4 h-4"
                                style={{
                                  color: "var(--ag-color-accent, #00f5d4)",
                                }}
                              />
                            ) : step.status === "in-progress" ? (
                              <div
                                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                                style={{
                                  borderColor: chave.color,
                                  borderTopColor: "transparent",
                                }}
                              />
                            ) : (
                              <Lock
                                className="w-4 h-4"
                                style={{
                                  color: "var(--ag-color-disabled, #476c7e)",
                                }}
                              />
                            )}
                            <span
                              className="font-semibold"
                              style={{
                                color:
                                  step.status === "locked"
                                    ? "var(--ag-color-disabled, #476c7e)"
                                    : "var(--ag-color-text, #ecfeff)",
                              }}
                            >
                              {idx + 1}. {step.title}
                            </span>
                          </div>
                          <span
                            className="text-[10px] font-mono font-semibold"
                            style={{
                              color: "var(--ag-color-text-muted, #88d4e3)",
                            }}
                          >
                            +{step.xp} XP
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Barra de Progreso y Call to Action */}
                  <div
                    className="relative z-10 pt-4 border-t flex items-center justify-between"
                    style={{
                      borderColor:
                        "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
                    }}
                  >
                    <div
                      className="w-1/2 h-2 overflow-hidden border"
                      style={{
                        borderRadius: "var(--ag-radius-pill, 999px)",
                        backgroundColor:
                          "var(--ag-color-surface-solid, #0c2d40)",
                        borderColor:
                          "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
                      }}
                    >
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${chave.progress}%`,
                          backgroundColor: chave.color,
                          boxShadow: `0 0 12px ${chave.color}`,
                          borderRadius: "var(--ag-radius-pill, 999px)",
                        }}
                      />
                    </div>

                    <div
                      className="flex items-center gap-1 text-xs font-bold group-hover:translate-x-1.5 transition-transform"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ backgroundColor: "rgba(2, 12, 18, 0.78)" }}
        >
          <div
            className="w-full max-w-xl border p-7 relative animate-in fade-in zoom-in-95 duration-200 backdrop-blur-2xl"
            style={{
              borderRadius: "var(--ag-radius-card, 20px)",
              backgroundColor: "var(--ag-color-sidebar, rgba(6, 26, 38, 0.96))",
              borderColor: "var(--ag-color-border, rgba(45, 212, 191, 0.35))",
              boxShadow:
                "0 24px 60px -12px var(--ag-color-shadow, rgba(0,245,212,0.28))",
            }}
          >
            <button
              onClick={() => setSelectedChave(null)}
              className="absolute top-6 right-6 p-2 transition-all hover:scale-110 cursor-pointer"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                color: "var(--ag-color-text-muted, #88d4e3)",
              }}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 border ${selectedChave.badgeBg}`}
                style={{ borderRadius: "var(--ag-radius-pill, 999px)" }}
              >
                {selectedChave.tag}
              </span>
              <span
                className="text-xs font-mono font-semibold"
                style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
              >
                {selectedChave.progress}% Concluído
              </span>
            </div>

            <h2
              className="text-2xl font-extrabold mb-1"
              style={{ color: "var(--ag-color-text, #ecfeff)" }}
            >
              {selectedChave.title}
            </h2>
            <p
              className="text-xs mb-6"
              style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
            >
              {selectedChave.subtitle}
            </p>

            <div className="space-y-3 mb-6">
              {selectedChave.steps.map((st, i) => (
                <div
                  key={st.id}
                  className="p-3.5 border flex items-start gap-3 transition-colors"
                  style={{
                    borderRadius: "var(--ag-radius-control, 12px)",
                    backgroundColor: "var(--ag-color-surface-solid, #0c2d40)",
                    borderColor:
                      "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
                  }}
                >
                  <div className="mt-0.5">
                    {st.status === "completed" ? (
                      <CheckCircle2
                        className="w-4 h-4"
                        style={{ color: "var(--ag-color-accent, #00f5d4)" }}
                      />
                    ) : st.status === "in-progress" ? (
                      <div
                        className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                        style={{
                          borderColor: "var(--ag-color-accent, #00f5d4)",
                          borderTopColor: "transparent",
                        }}
                      />
                    ) : (
                      <Lock
                        className="w-4 h-4"
                        style={{ color: "var(--ag-color-disabled, #476c7e)" }}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className="text-xs font-bold"
                        style={{ color: "var(--ag-color-text, #ecfeff)" }}
                      >
                        {i + 1}. {st.title}
                      </h4>
                      <span
                        className="text-[10px] font-mono font-semibold"
                        style={{ color: "var(--ag-color-accent, #00f5d4)" }}
                      >
                        +{st.xp} XP
                      </span>
                    </div>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
                    >
                      {st.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedChave(null)}
              className="w-full py-3 font-extrabold text-xs uppercase tracking-wider transition-all hover:opacity-95 cursor-pointer"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                background:
                  "linear-gradient(135deg, var(--ag-color-accent, #00f5d4), var(--ag-color-info, #00bbf9))",
                color: "var(--ag-color-on-accent, #031924)",
                boxShadow: "0 0 24px -4px rgba(0, 245, 212, 0.45)",
              }}
            >
              Continuar Missão
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL: ENTREGA DE PROJETO (SUBMISSION TURQUOISE RESKIN)
      ────────────────────────────────────────────────────────────── */}
      {isSubmissionOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ backgroundColor: "rgba(2, 12, 18, 0.78)" }}
        >
          <div
            className="w-full max-w-lg border p-8 relative animate-in fade-in zoom-in-95 duration-200 backdrop-blur-2xl"
            style={{
              borderRadius: "var(--ag-radius-card, 20px)",
              backgroundColor: "var(--ag-color-sidebar, rgba(6, 26, 38, 0.96))",
              borderColor: "var(--ag-color-border, rgba(45, 212, 191, 0.35))",
              boxShadow:
                "0 24px 60px -12px var(--ag-color-shadow, rgba(0,245,212,0.28))",
            }}
          >
            <button
              onClick={() => setIsSubmissionOpen(false)}
              className="absolute top-6 right-6 p-2 transition-all hover:scale-110 cursor-pointer"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                color: "var(--ag-color-text-muted, #88d4e3)",
              }}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-8 h-8 border flex items-center justify-center"
                style={{
                  borderRadius: "var(--ag-radius-control, 12px)",
                  backgroundColor: "rgba(0, 245, 212, 0.16)",
                  borderColor: "rgba(0, 245, 212, 0.4)",
                  color: "var(--ag-color-accent, #00f5d4)",
                }}
              >
                <Upload className="w-4 h-4" />
              </div>
              <h2
                className="text-xl font-extrabold"
                style={{ color: "var(--ag-color-text, #ecfeff)" }}
              >
                Entrega do Projeto
              </h2>
            </div>
            <p
              className="text-xs mb-6"
              style={{ color: "var(--ag-color-text-muted, #88d4e3)" }}
            >
              Disponibilize o link funcional da sua solução para avaliação da
              banca examinadora.
            </p>

            {/* Selector de Tipo */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                type="button"
                onClick={() => setSubmissionType("deploy")}
                className="flex flex-col items-center gap-2 p-3 border text-xs font-semibold transition-all cursor-pointer hover:-translate-y-0.5"
                style={{
                  borderRadius: "var(--ag-radius-control, 12px)",
                  backgroundColor:
                    submissionType === "deploy"
                      ? "rgba(0, 245, 212, 0.18)"
                      : "var(--ag-color-surface-solid, #0c2d40)",
                  borderColor:
                    submissionType === "deploy"
                      ? "var(--ag-color-accent, #00f5d4)"
                      : "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
                  color:
                    submissionType === "deploy"
                      ? "var(--ag-color-accent, #00f5d4)"
                      : "var(--ag-color-text-muted, #88d4e3)",
                }}
              >
                <ExternalLink className="w-4 h-4" />
                <span>Deploy Web</span>
              </button>

              <button
                type="button"
                onClick={() => setSubmissionType("repo")}
                className="flex flex-col items-center gap-2 p-3 border text-xs font-semibold transition-all cursor-pointer hover:-translate-y-0.5"
                style={{
                  borderRadius: "var(--ag-radius-control, 12px)",
                  backgroundColor:
                    submissionType === "repo"
                      ? "rgba(56, 189, 248, 0.18)"
                      : "var(--ag-color-surface-solid, #0c2d40)",
                  borderColor:
                    submissionType === "repo"
                      ? "var(--ag-color-secondary, #38bdf8)"
                      : "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
                  color:
                    submissionType === "repo"
                      ? "var(--ag-color-secondary, #38bdf8)"
                      : "var(--ag-color-text-muted, #88d4e3)",
                }}
              >
                <GitBranch className="w-4 h-4" />
                <span>Repositório</span>
              </button>

              <button
                type="button"
                onClick={() => setSubmissionType("file")}
                className="flex flex-col items-center gap-2 p-3 border text-xs font-semibold transition-all cursor-pointer hover:-translate-y-0.5"
                style={{
                  borderRadius: "var(--ag-radius-control, 12px)",
                  backgroundColor:
                    submissionType === "file"
                      ? "rgba(0, 187, 249, 0.18)"
                      : "var(--ag-color-surface-solid, #0c2d40)",
                  borderColor:
                    submissionType === "file"
                      ? "var(--ag-color-info, #00bbf9)"
                      : "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
                  color:
                    submissionType === "file"
                      ? "var(--ag-color-info, #00bbf9)"
                      : "var(--ag-color-text-muted, #88d4e3)",
                }}
              >
                <FileText className="w-4 h-4" />
                <span>PDF / Pitch</span>
              </button>
            </div>

            {/* Input URL */}
            <div className="space-y-2 mb-6">
              <label
                className="block text-xs font-bold"
                style={{ color: "var(--ag-color-text, #ecfeff)" }}
              >
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
                className="w-full px-4 py-3 border text-xs font-mono focus:outline-none transition-all"
                style={{
                  borderRadius: "var(--ag-radius-control, 12px)",
                  backgroundColor: "var(--ag-color-surface-solid, #0c2d40)",
                  borderColor:
                    "var(--ag-color-border, rgba(45, 212, 191, 0.24))",
                  color: "var(--ag-color-text, #ecfeff)",
                }}
              />
            </div>

            {/* Botón Salvar */}
            <button
              onClick={() => {
                setSubmitted(true);
                setIsSubmissionOpen(false);
              }}
              className="w-full py-3.5 font-extrabold text-xs uppercase tracking-wider hover:opacity-95 transition-all cursor-pointer"
              style={{
                borderRadius: "var(--ag-radius-control, 12px)",
                background:
                  "linear-gradient(135deg, var(--ag-color-accent, #00f5d4), var(--ag-color-info, #00bbf9))",
                color: "var(--ag-color-on-accent, #031924)",
                boxShadow:
                  "0 0 28px -4px var(--ag-color-selection-glow, rgba(0,245,212,0.5))",
              }}
            >
              Confirmar Entrega do Team Raiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
