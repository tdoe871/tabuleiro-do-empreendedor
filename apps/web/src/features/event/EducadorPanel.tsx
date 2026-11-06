"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { GemLogo } from "@/components/ui/GemLogo";
import { LangSwitcher } from "@/components/shared/LangSwitcher";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import {
  KEY_IDS,
  KEY_COLOR_VAR,
  type KeyId,
  type KeyTranslation,
} from "@/features/event/keys";
import { CreateSessionModal } from "./CreateSessionModal";

export type SessionStatus = "aguardando" | "ativa" | "pausada" | "finalizada";

export interface EduSession {
  id: string;
  titulo: string;
  codigo: string;
  status: SessionStatus;
  numEquipes: number;
  integrantes: number;
  modo: "escolar" | "personalizado";
  cenario: string | null;
}

// Shape of docs/backend/api.md's EventDTO — what POST/GET /api/events and
// PATCH /api/events/:id/status actually return.
export interface EventDTO {
  id: string;
  code: string;
  name: string;
  mode: "escolar" | "personalizado";
  scenario: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
  maxTeams: number;
  maxTeamSize: number;
}

const STATUS_FROM_API: Record<EventDTO["status"], SessionStatus> = {
  DRAFT: "aguardando",
  ACTIVE: "ativa",
  PAUSED: "pausada",
  FINISHED: "finalizada",
};

function eventToSession(event: EventDTO): EduSession {
  return {
    id: event.id,
    titulo: event.name,
    codigo: event.code,
    status: STATUS_FROM_API[event.status],
    numEquipes: event.maxTeams,
    integrantes: event.maxTeamSize,
    modo: event.mode,
    cenario: event.scenario,
  };
}

type OverviewKeyStatus = "ativa" | "concluida" | "bloqueada";

interface OverviewTeam {
  id: string;
  name: string;
  memberCount: number;
  score: number;
  keys: Record<KeyId, OverviewKeyStatus>;
  submission: { type: string } | null;
}

interface OverviewAlert {
  id: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
}

interface Overview {
  metrics: { activeTeams: number; participants: number; keysCompleted: number };
  teams: OverviewTeam[];
  alerts: OverviewAlert[];
}

const NEXT_STATUS: Partial<
  Record<
    SessionStatus,
    { next: SessionStatus; actionKey: "iniciar" | "pausar" | "retomar" }
  >
> = {
  aguardando: { next: "ativa", actionKey: "iniciar" },
  ativa: { next: "pausada", actionKey: "pausar" },
  pausada: { next: "ativa", actionKey: "retomar" },
};

const AVATAR_COLORS = ["#2E80F0", "#22C97A", "#A040E0", "#0FD4B0", "#F0BC40"];

// Ported from tdoe/tdoe_app.py GET /novas-funcoes — a static "coming soon"
// roadmap list, not a backend-driven feature. Kept hardcoded like the icons
// in keys.ts/rpgRoles.ts.
const EXTENSOES_IDS = [
  "desafiosExtras",
  "coringas",
  "cartasPedagogicas",
] as const;
const EXTENSOES_ICON: Record<(typeof EXTENSOES_IDS)[number], string> = {
  desafiosExtras: "⚡",
  coringas: "🃏",
  cartasPedagogicas: "📚",
};

const OVERVIEW_POLL_MS = 15_000;

export function EducadorPanel() {
  const t = useTranslations("educador");
  const tKeys = useTranslations("keys");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const router = useRouter();

  const [sessions, setSessions] = useState<EduSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overviewState, setOverviewState] = useState<
    (Overview & { sessionId: string }) | null
  >(null);
  const overview =
    overviewState && overviewState.sessionId === selectedId
      ? overviewState
      : null;
  const [showCreate, setShowCreate] = useState(false);
  const [showExtensoes, setShowExtensoes] = useState(false);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [cartaAtiva, setCartaAtiva] = useState<{
    keyId: string;
    text: string;
  } | null>(null);

  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timerPreset, setTimerPreset] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimerToStudents, setShowTimerToStudents] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  function errorMessage(code: string | undefined, fallback: string) {
    return code && tCommon.has(`errors.${code}`)
      ? tCommon(`errors.${code}`)
      : fallback;
  }

  // The educator's own sessions, for the sidebar list.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/events");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const body = (await res.json().catch(() => null)) as {
        events?: EventDTO[];
      } | null;
      if (!cancelled && res.ok && body?.events) {
        setSessions(body.events.map(eventToSession));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Metrics/teams/alerts for the selected session — refreshed on selection
  // and polled while a hackathon is live, so the educator sees progress
  // without reloading the page.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/events/${selectedId}/overview`);
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const body = (await res.json().catch(() => null)) as Overview | null;
      if (!cancelled && res.ok && body && selectedId) {
        setOverviewState({ ...body, sessionId: selectedId });
      }
    }
    load();
    const interval = setInterval(load, OVERVIEW_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedId, router]);

  useEffect(() => {
    if (!timerRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimerSeconds((s) => {
        if (s === null || s <= 0) {
          setTimerRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  function selectSession(id: string) {
    setSelectedId(id);
  }

  async function changeStatus(target: "ACTIVE" | "PAUSED" | "FINISHED") {
    if (!selected) {
      toast("err", t("toasts.selecioneSessao"));
      return;
    }
    try {
      const res = await fetch(`/api/events/${selected.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const body = (await res.json().catch(() => null)) as {
        event?: EventDTO;
        error?: string;
      } | null;
      if (!res.ok || !body?.event) {
        toast(
          "err",
          errorMessage(body?.error, tCommon("errors.INTERNAL_ERROR")),
        );
        return;
      }
      const updated = eventToSession(body.event);
      setSessions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
      toast("ok", t(`status.${updated.status}`));
    } catch {
      toast("err", tCommon("errors.INTERNAL_ERROR"));
    }
  }

  function handleSessionAction() {
    if (!selected) {
      toast("err", t("toasts.selecioneSessao"));
      return;
    }
    const target = NEXT_STATUS[selected.status];
    if (!target) return;
    void changeStatus(target.next === "ativa" ? "ACTIVE" : "PAUSED");
  }

  function handleVerificarAlertas() {
    if (!selected) {
      toast("err", t("toasts.selecioneSessao"));
      return;
    }
    const count = overview?.alerts.length ?? 0;
    if (count > 0) {
      toast("err", t("toasts.alertasEncontrados", { count }));
    } else {
      toast("ok", t("toasts.nenhumAlertaNovo"));
    }
  }

  function handlePending(label: string) {
    toast("info", tCommon("toasts.featurePendente", { feature: label }));
  }

  function handleSocializar() {
    if (!selected) {
      toast("err", t("toasts.selecioneSessao"));
      return;
    }
    router.push(`/mestre/socializacao?numEquipes=${selected.numEquipes}`);
  }

  function openCartaPreview(keyId: string) {
    setPreviewKey(keyId);
    setPreviewText(t(`carta.prompts.${keyId}`));
  }

  function confirmarEnvioCarta() {
    if (!previewKey) return;
    setCartaAtiva({ keyId: previewKey, text: previewText });
    setPreviewKey(null);
    toast("ok", t("carta.enviar"));
  }

  function fmtClock(total: number) {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const canStart = selected?.status === "aguardando";
  const canPause = selected?.status === "ativa";
  const canResume = selected?.status === "pausada";

  return (
    <div id="tela-educador">
      <div className="topbar bg-neon-bg/80 backdrop-blur-xl border-b border-white/10">
        <div className="tb-logo">
          <div className="tb-gem backdrop-blur-md transition-all duration-300 hover:shadow-glow-amber">
            <GemLogo size={14} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700 }}>TdoE</span>
        </div>
        <div className="tb-sep" />
        <span className="tb-sub">
          {selected ? selected.titulo : t("painelTitulo")}
        </span>
        <div className="tb-right">
          {selected && (
            <div
              className="badge"
              style={{
                background: "var(--prob-bg)",
                color: "var(--prob)",
                borderColor: "var(--prob-bd)",
              }}
            >
              ⬤ {t(`status.${selected.status}`)}
            </div>
          )}
          <LangSwitcher />
          <button
            className="btn btn-gold btn-sm"
            onClick={() => setShowExtensoes(true)}
          >
            ☕ {t("extensoes")}
          </button>
          {selected && selected.status !== "finalizada" && (
            <button
              className="btn btn-sm"
              style={{
                background: "var(--parc-bg)",
                color: "var(--parc)",
                border: "1.5px solid var(--parc-bd)",
              }}
              onClick={handleSessionAction}
            >
              ▶ {t(`acao.${NEXT_STATUS[selected.status]?.actionKey}`)}
            </button>
          )}
          <button
            className="btn btn-sm"
            style={{
              background: "linear-gradient(135deg,var(--parc),#5B6CF0)",
              color: "#fff",
            }}
            onClick={handleSocializar}
          >
            ↗ {t("socializar")}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/")}
          >
            {t("sair")}
          </button>
        </div>
      </div>

      <div className="edu-layout">
        <div className="sidebar bg-white/[0.03] backdrop-blur-xl border-r border-white/10">
          <div className="sidebar-sec">{t("sidebar.sessoes")}</div>
          <div>
            {sessions.length === 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--t3)",
                  padding: "6px 14px",
                }}
              >
                {t("nenhumaSessao")}
              </div>
            )}
            {sessions.map((s, i) => (
              <div
                key={s.id}
                className={`eq-item transition-all duration-200 hover:bg-white/5 hover:translate-x-0.5 ${s.id === selectedId ? "on" : ""}`}
                onClick={() => selectSession(s.id)}
              >
                <div
                  className="eq-av"
                  style={{
                    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                  }}
                >
                  S{i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="eq-nm">{s.titulo}</div>
                  <div className="eq-st">
                    {t(`status.${s.status}`)} · {s.codigo}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="sidebar-divider" />
          <div className="sidebar-sec">{t("sidebar.acoes")}</div>
          <div
            className="sidebar-action rounded-lg mx-1.5 transition-all duration-200 hover:bg-white/5 hover:text-neon-lime"
            onClick={() => setShowCreate(true)}
          >
            ＋ {t("sidebar.novaSessao")}
          </div>
          <div
            className="sidebar-action rounded-lg mx-1.5 transition-all duration-200 hover:bg-white/5 hover:text-neon-lime"
            onClick={handleVerificarAlertas}
          >
            🔔 {t("sidebar.verificarAlertas")}
          </div>
          <div
            className="sidebar-action rounded-lg mx-1.5 transition-all duration-200 hover:bg-white/5 hover:text-neon-lime"
            onClick={handleSocializar}
          >
            ↗ {t("socializar")}
          </div>
          <div className="sidebar-divider" />
          <div className="sidebar-sec">{t("sidebar.exportar")}</div>
          <div
            className="sidebar-action rounded-lg mx-1.5 transition-all duration-200 hover:bg-white/5 hover:text-neon-lime"
            onClick={() => handlePending(t("sidebar.relatorio"))}
          >
            📋 {t("sidebar.relatorio")}
          </div>
          <div
            className="sidebar-action rounded-lg mx-1.5 transition-all duration-200 hover:bg-white/5 hover:text-neon-lime"
            onClick={() => handlePending(t("sidebar.exportarPropostas"))}
          >
            📄 {t("sidebar.exportarPropostas")}
          </div>
          <div
            className="sidebar-action rounded-lg mx-1.5 transition-all duration-200 hover:bg-white/5 hover:text-neon-lime"
            onClick={() => router.push("/")}
          >
            ← {t("sair")}
          </div>
        </div>

        <div className="edu-main">
          <div className="metrics">
            <div className="metric-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-lime/40 hover:shadow-glow-lime">
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "var(--prob)",
                }}
              />
              <div className="m-val" style={{ color: "var(--prob)" }}>
                {selected ? (overview?.metrics.activeTeams ?? "…") : "—"}
              </div>
              <div className="m-lbl">{t("metrics.equipesAtivas")}</div>
            </div>
            <div className="metric-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-cyan/40 hover:shadow-glow-cyan">
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "var(--sol)",
                }}
              />
              <div className="m-val">
                {selected ? (overview?.metrics.participants ?? "…") : "0"}
              </div>
              <div className="m-lbl">{t("metrics.participantes")}</div>
            </div>
            <div className="metric-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-purple/40 hover:shadow-glow-purple">
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "var(--parc)",
                }}
              />
              <div className="m-val" style={{ color: "var(--sol)" }}>
                {selected ? (overview?.metrics.keysCompleted ?? "…") : "0"}
              </div>
              <div className="m-lbl">{t("metrics.chavesConcluidas")}</div>
            </div>
            <div className="metric-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-amber/40 hover:shadow-glow-amber">
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "var(--opor)",
                }}
              />
              <div
                className="m-val"
                style={{ color: "var(--gold)", fontSize: 20 }}
              >
                {selected ? selected.codigo : "—"}
              </div>
              <div className="m-lbl">{t("metrics.codigoAcesso")}</div>
            </div>
          </div>

          <div className="prog-row">
            {KEY_IDS.map((id) => {
              const key = tKeys.raw(id) as KeyTranslation;
              const teams = overview?.teams ?? [];
              const completed = teams.filter(
                (team) => team.keys[id] === "concluida",
              ).length;
              const pct = teams.length
                ? Math.round((completed / teams.length) * 100)
                : 0;
              return (
                <div
                  className="prog-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-lime/35 hover:shadow-glow-lime"
                  key={id}
                >
                  <div className="pc-head">
                    <div
                      className="pc-icon"
                      style={{ background: `var(${KEY_COLOR_VAR[id]}-bg)` }}
                    >
                      {key.icon}
                    </div>
                    <div
                      className="pc-name"
                      style={{ color: `var(${KEY_COLOR_VAR[id]})` }}
                    >
                      {key.name}
                    </div>
                    <div className="pc-ct">
                      {completed}/{teams.length}
                    </div>
                  </div>
                  <div className="pc-bar">
                    <div
                      className="pc-fill"
                      style={{
                        width: `${pct}%`,
                        background: `var(${KEY_COLOR_VAR[id]})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="equipes-grid">
            {!selected && (
              <div style={{ fontSize: 11, color: "var(--t3)" }}>
                {t("toasts.selecioneSessao")}
              </div>
            )}
            {selected && overview && overview.teams.length === 0 && (
              <div
                className="card card-pad"
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  border: "1px dashed var(--border2)",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>👥</div>
                <div style={{ fontSize: 12, color: "var(--t2)" }}>
                  {t("equipesVazio", { codigo: selected.codigo })}
                </div>
              </div>
            )}
            {selected &&
              overview &&
              overview.teams.map((team, i) => {
                const activeKey = KEY_IDS.find(
                  (id) => team.keys[id] === "ativa",
                );
                const completed = KEY_IDS.filter(
                  (id) => team.keys[id] === "concluida",
                ).length;
                const pct = Math.round((completed / KEY_IDS.length) * 100);
                return (
                  <div className="eq-card" key={team.id}>
                    <div className="eq-card-head">
                      <div
                        className="eq-card-av"
                        style={{
                          background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                        }}
                      >
                        E{i + 1}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="eq-card-nm">{team.name}</div>
                        <div className="eq-card-st">
                          {activeKey
                            ? (tKeys.raw(activeKey) as KeyTranslation).name
                            : t("equipeCard.semChaveAtiva")}
                        </div>
                      </div>
                    </div>
                    <div className="eq-card-dots">
                      {KEY_IDS.map((id) => {
                        const status = team.keys[id];
                        const opacity =
                          status === "concluida"
                            ? 1
                            : status === "ativa"
                              ? 0.6
                              : 0.15;
                        return (
                          <div
                            key={id}
                            className="eq-card-dot"
                            style={{
                              background: `var(${KEY_COLOR_VAR[id]})`,
                              opacity,
                            }}
                          />
                        );
                      })}
                    </div>
                    <div className="eq-prog-bar">
                      <div
                        className="eq-prog-fill"
                        style={{
                          width: `${pct}%`,
                          background: activeKey
                            ? `var(${KEY_COLOR_VAR[activeKey]})`
                            : "var(--t3)",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        className="badge tiny"
                        style={{
                          background: "rgba(255,255,255,.05)",
                          color: "var(--t3)",
                          borderColor: "var(--border)",
                        }}
                      >
                        {completed}/4 {t("equipeCard.chaves")}
                      </div>
                      <div
                        className="badge tiny"
                        style={{
                          background: "rgba(255,255,255,.05)",
                          color: "var(--t3)",
                          borderColor: "var(--border)",
                        }}
                      >
                        👤 {team.memberCount}
                      </div>
                      {team.submission && (
                        <div
                          className="badge tiny"
                          style={{
                            background: "rgba(34,197,94,.12)",
                            color: "#22c55e",
                            borderColor: "rgba(34,197,94,.3)",
                          }}
                        >
                          ✓ {t("equipeCard.entregou")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="edu-right bg-white/[0.03] backdrop-blur-xl border-l border-white/10">
          <div className="panel-title">{t("right.alertasMediacao")}</div>
          {!overview || overview.alerts.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--t3)" }}>
              {t("right.nenhumAlerta")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {overview.alerts.map((alert) => {
                const color =
                  alert.severity === "CRITICAL"
                    ? "#ef4444"
                    : alert.severity === "WARNING"
                      ? "var(--gold)"
                      : "var(--parc)";
                const bg =
                  alert.severity === "CRITICAL"
                    ? "rgba(239,68,68,.1)"
                    : alert.severity === "WARNING"
                      ? "var(--gold-bg)"
                      : "var(--parc-bg)";
                const bd =
                  alert.severity === "CRITICAL"
                    ? "1.5px solid rgba(239,68,68,.3)"
                    : alert.severity === "WARNING"
                      ? "1.5px solid var(--gold-bd)"
                      : "1.5px solid var(--parc-bd)";
                const icon =
                  alert.severity === "CRITICAL"
                    ? "⚠"
                    : alert.severity === "WARNING"
                      ? "⏱"
                      : "★";
                return (
                  <div
                    key={alert.id}
                    className="alert-card"
                    style={{ background: bg, border: bd }}
                  >
                    <div
                      className="alert-icon"
                      style={{ background: bg, fontSize: 14 }}
                    >
                      {icon}
                    </div>
                    <div>
                      <div className="alert-nm" style={{ color }}>
                        {alert.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="sidebar-divider" />
          <div className="panel-title">{t("right.controlesSessao")}</div>
          <div className="ctrl-grid">
            <div
              className={`ctrl-btn bg-white/5 backdrop-blur-md border-white/10 transition-all duration-200 hover:border-neon-lime/40 hover:text-white hover:shadow-glow-lime ${!canStart ? "opacity-40 pointer-events-none" : ""}`}
              onClick={() => canStart && changeStatus("ACTIVE")}
            >
              ▶ {t("right.iniciar")}
            </div>
            <div
              className={`ctrl-btn bg-white/5 backdrop-blur-md border-white/10 transition-all duration-200 hover:border-neon-amber/40 hover:text-white hover:shadow-glow-amber ${!canPause ? "opacity-40 pointer-events-none" : ""}`}
              onClick={() => canPause && changeStatus("PAUSED")}
            >
              ⏸ {t("right.pausar")}
            </div>
            <div
              className={`ctrl-btn bg-white/5 backdrop-blur-md border-white/10 transition-all duration-200 hover:border-neon-cyan/40 hover:text-white hover:shadow-glow-cyan ${!canResume ? "opacity-40 pointer-events-none" : ""}`}
              onClick={() => canResume && changeStatus("ACTIVE")}
            >
              ↺ {t("right.retomar")}
            </div>
            <div
              className="ctrl-btn bg-white/5 backdrop-blur-md border-white/10 transition-all duration-200 hover:border-neon-purple/40 hover:text-white hover:shadow-glow-purple"
              onClick={handleVerificarAlertas}
            >
              🔔 {t("right.alertas")}
            </div>
          </div>
          <div className="sidebar-divider" />
          <div className="panel-title">⏱ {t("timer.titulo")}</div>
          <div className="timer-edu-block">
            <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 4 }}>
              {t("timer.duracao")}
            </div>
            <div className="timer-presets">
              {[5, 15, 20, 30].map((min) => (
                <button
                  key={min}
                  className={`timer-preset-btn ${timerPreset === min ? "sel" : ""}`}
                  onClick={() => {
                    setTimerPreset(min);
                    setTimerMinutes(min);
                    setTimerSeconds(min * 60);
                  }}
                >
                  {min} min
                </button>
              ))}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: "var(--t1)",
                letterSpacing: "-.5px",
                textAlign: "center",
                margin: "6px 0 4px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {timerSeconds !== null ? fmtClock(timerSeconds) : "—"}
            </div>
            <div className="timer-ctrl-row">
              <button
                className="timer-ctrl-btn timer-start"
                onClick={() => {
                  if (timerSeconds === null && timerMinutes)
                    setTimerSeconds(timerMinutes * 60);
                  if (timerSeconds !== null) setTimerRunning(true);
                }}
              >
                ▶ {t("timer.iniciar")}
              </button>
              <button
                className="timer-ctrl-btn timer-stop"
                onClick={() => setTimerRunning(false)}
              >
                ⏹ {t("timer.parar")}
              </button>
            </div>
            <div className="timer-toggle-row bg-white/5 backdrop-blur-md border-white/10">
              <span className="timer-toggle-lbl">
                {t("timer.mostrarEstudantes")}
              </span>
              <label className="toggle-sw">
                <input
                  type="checkbox"
                  checked={showTimerToStudents}
                  onChange={(e) => setShowTimerToStudents(e.target.checked)}
                />
                <div className="toggle-track" />
                <div className="toggle-thumb" />
              </label>
            </div>
          </div>
          <div className="sidebar-divider" />
          <div className="panel-title">🃏 {t("carta.titulo")}</div>
          <div className="carta-launcher">
            {KEY_IDS.map((id) => {
              const key = tKeys.raw(id) as KeyTranslation;
              return (
                <button
                  key={id}
                  className="carta-launcher-btn backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow-purple"
                  style={{
                    borderColor: `var(${KEY_COLOR_VAR[id]}-bd)`,
                    background: `var(${KEY_COLOR_VAR[id]}-bg)`,
                  }}
                  onClick={() => openCartaPreview(id)}
                >
                  <div
                    className="carta-launcher-icone"
                    style={{ background: `var(${KEY_COLOR_VAR[id]}-bg)` }}
                  >
                    {key.icon}
                  </div>
                  <div>
                    <div className="carta-launcher-nm">{key.name}</div>
                    <div className="carta-launcher-sub">
                      {t(`carta.launcherSub.${id}`)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {cartaAtiva && (
            <div
              style={{
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 9,
                background: "var(--gold-bg)",
                border: "1px solid var(--gold-bd)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--gold)",
                  marginBottom: 4,
                }}
              >
                🃏 {t("carta.ativa")}
              </div>
              <div style={{ fontSize: 11, color: "var(--t2)" }}>
                {cartaAtiva.text}
              </div>
              <button
                onClick={() => setCartaAtiva(null)}
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  color: "#ef4444",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ✕ {t("carta.remover")}
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={(event) => {
            const session = eventToSession(event);
            setSessions((prev) => [session, ...prev]);
            setSelectedId(session.id);
            setShowCreate(false);
          }}
        />
      )}

      {previewKey && (
        <Modal onClose={() => setPreviewKey(null)} maxWidth={480}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 28,
                width: 48,
                height: 48,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `var(${KEY_COLOR_VAR[previewKey as keyof typeof KEY_COLOR_VAR]}-bg)`,
              }}
            >
              {(tKeys.raw(previewKey) as KeyTranslation).icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  opacity: 0.6,
                }}
              >
                {t("carta.titulo")}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>
                {(tKeys.raw(previewKey) as KeyTranslation).name}
              </div>
            </div>
          </div>
          <div className="field">
            <label>{t("carta.titulo")}</label>
            <textarea
              style={{ height: 90, resize: "vertical" }}
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 4,
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={() => setPreviewKey(null)}
            >
              {t("modalSessao.cancelar")}
            </button>
            <button className="btn btn-primary" onClick={confirmarEnvioCarta}>
              🃏 {t("carta.enviar")}
            </button>
          </div>
        </Modal>
      )}

      {showExtensoes && (
        <Modal onClose={() => setShowExtensoes(false)} maxWidth={440}>
          <h3>☕ {t("extensoes")}</h3>
          <p>{t("extensoesModal.subtitulo")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {EXTENSOES_IDS.map((id) => (
              <div
                key={id}
                style={{
                  background: "var(--gold-bg)",
                  border: "1px solid var(--gold-bd)",
                  borderRadius: 9,
                  padding: "9px 11px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--gold)",
                  }}
                >
                  {EXTENSOES_ICON[id]} {t(`extensoesModal.items.${id}.nome`)}
                </div>
                <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 3 }}>
                  {t(`extensoesModal.items.${id}.descricao`)}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: "rgba(240,188,64,.5)",
                    marginTop: 4,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {t("extensoesModal.emBreve")}
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn btn-ghost w100"
            style={{ marginTop: 20 }}
            onClick={() => setShowExtensoes(false)}
          >
            {t("extensoesModal.fechar")}
          </button>
        </Modal>
      )}
    </div>
  );
}
