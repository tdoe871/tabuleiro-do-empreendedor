"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { GemLogo } from "@/components/ui/GemLogo";
import { LangSwitcher } from "@/components/shared/LangSwitcher";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { sendJson, readApiError, translateApiError } from "@/lib/api/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
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

// Shape of docs/backend/api.md's EventDTO — what POST/GET /api/events,
// PATCH /api/events/:id/status and GET /api/events/:id/overview return.
export interface EventDTO {
  id: string;
  code: string;
  name: string;
  mode: "escolar" | "personalizado";
  scenario: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
  maxTeams: number;
  maxTeamSize: number;
  mentorCode: string | null;
  activityTimer: { endsAt: string; seconds: number; visible: boolean } | null;
  challengeCard: { key: KeyId; text: string } | null;
  switches: { chat: boolean; submissions: boolean; joins: boolean };
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
  type: "NO_SUBMISSION" | "TEAM_STUCK" | "TEAM_INCOMPLETE" | "CUSTOM";
  severity: "INFO" | "WARNING" | "CRITICAL";
  team: { id: string; name: string } | null;
  minutes: number | null;
  message: string;
}

interface Announcement {
  id: string;
  text: string;
  createdAt: string;
}

interface Overview {
  event: EventDTO;
  metrics: { activeTeams: number; participants: number; keysCompleted: number };
  teams: OverviewTeam[];
  alerts: OverviewAlert[];
  announcements: Announcement[];
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

// Modern Interactive Turquoise palette (docs/backend/themes-info/theme.md),
// scoped to this screen only via inline Tailwind arbitrary values — no
// global theme bridge, so the player/mentor/login screens keep their own
// look untouched.
const AVATAR_COLORS = ["#00F5D4", "#00BBF9", "#2DD4BF", "#38BDF8", "#FBBF24"];
const ACTIVITY_PRESETS = [5, 15, 20, 30];
const AG_SIDEBAR = "bg-[var(--ag-color-sidebar,rgba(6,26,38,0.90))]";
const AG_BORDER = "border-[var(--ag-color-border,rgba(45,212,191,0.24))]";
const AG_SURFACE = "bg-[var(--ag-color-surface,rgba(10,38,54,0.78))]";
const AG_SURFACE_SOLID = "bg-[var(--ag-color-surface-solid,#0c2d40)]";
const AG_SURFACE_FEATURED =
  "bg-[var(--ag-color-surface-featured,rgba(14,48,66,0.88))]";
const AG_HOVER =
  "hover:bg-[var(--ag-color-surface-hover,rgba(0,245,212,0.12))]";
const AG_TEXT = "text-[var(--ag-color-text,#ecfeff)]";
const AG_CARD = `${AG_SURFACE} backdrop-blur-2xl border ${AG_BORDER} rounded-[20px]`;
const AG_START_BTN =
  "bg-gradient-to-r from-[#00F5D4] to-[#00BBF9] text-[#031924] font-extrabold uppercase border-none shadow-[0_0_24px_-4px_rgba(0,245,212,0.5)] rounded-[12px] transition-all duration-200 hover:shadow-[0_0_30px_0px_rgba(0,245,212,0.75)] hover:scale-[1.02] active:scale-[0.98]";

// Ported from tdoe/tdoe_app.py GET /novas-funcoes — a static "coming soon"
// roadmap list, not a backend-driven feature.
const EXTENSOES_ICON = {
  desafiosExtras: "⚡",
  coringas: "🃏",
  cartasPedagogicas: "📚",
} as const;

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
  const [showMentores, setShowMentores] = useState(false);
  const [confirmingMentorId, setConfirmingMentorId] = useState<string | null>(
    null,
  );
  const [evaluations, setEvaluations] = useState<{
    mentorCode: string | null;
    mentors: { id: string; name: string; evaluated: number }[];
    teams: {
      id: string;
      name: string;
      summary: { count: number; average: number | null };
    }[];
  } | null>(null);
  const [announcementInput, setAnnouncementInput] = useState("");
  const [activityMinutes, setActivityMinutes] = useState(15);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;
  const event = overview?.event ?? null;

  const errorMessage = useCallback(
    (code: string | undefined, fallback: string) =>
      translateApiError(tCommon, code, fallback),
    [tCommon],
  );

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

  const loadOverview = useCallback(async () => {
    if (!selectedId) return;
    const res = await fetch(`/api/events/${selectedId}/overview`, {
      cache: "no-store",
    });
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const body = (await res.json().catch(() => null)) as Overview | null;
    if (res.ok && body) {
      setOverviewState({ ...body, sessionId: selectedId });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === body.event.id ? eventToSession(body.event) : s,
        ),
      );
    }
  }, [selectedId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on selection change, not a render-time update
    void loadOverview();
  }, [loadOverview]);

  useRealtime(() => void loadOverview(), { eventId: selectedId ?? undefined });

  function selectSession(id: string) {
    setSelectedId(id);
  }

  async function changeStatus(target: "ACTIVE" | "PAUSED" | "FINISHED") {
    if (!selected) {
      toast("err", t("toasts.selecioneSessao"));
      return;
    }
    try {
      const res = await sendJson(`/api/events/${selected.id}/status`, "PATCH", {
        status: target,
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
      void loadOverview();
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

  function handleSocializar() {
    if (!selected) {
      toast("err", t("toasts.selecioneSessao"));
      return;
    }
    router.push(`/mestre/socializacao?eventId=${selected.id}`);
  }

  function openCartaPreview(keyId: string) {
    setPreviewKey(keyId);
    setPreviewText(t(`carta.prompts.${keyId}`));
  }

  async function confirmarEnvioCarta() {
    if (!previewKey || !selected) return;
    const res = await sendJson(
      `/api/events/${selected.id}/challenge-card`,
      "PUT",
      { key: previewKey, text: previewText },
    );
    if (!res.ok) {
      const err = await readApiError(res);
      toast("err", errorMessage(err?.error, tCommon("errors.INTERNAL_ERROR")));
      return;
    }
    setPreviewKey(null);
    toast("ok", t("carta.enviar"));
    void loadOverview();
  }

  async function removerCarta() {
    if (!selected) return;
    const res = await sendJson(
      `/api/events/${selected.id}/challenge-card`,
      "DELETE",
    );
    if (!res.ok && res.status !== 204) {
      const err = await readApiError(res);
      toast("err", errorMessage(err?.error, tCommon("errors.INTERNAL_ERROR")));
      return;
    }
    void loadOverview();
  }

  async function iniciarTimer() {
    if (!selected) return;
    const res = await sendJson(
      `/api/events/${selected.id}/activity-timer`,
      "PUT",
      {
        minutes: activityMinutes,
        visible: true,
      },
    );
    if (!res.ok) {
      const err = await readApiError(res);
      toast("err", errorMessage(err?.error, tCommon("errors.INTERNAL_ERROR")));
      return;
    }
    void loadOverview();
  }

  async function pararTimer() {
    if (!selected) return;
    await sendJson(`/api/events/${selected.id}/activity-timer`, "DELETE");
    void loadOverview();
  }

  async function toggleTimerVisible(visible: boolean) {
    if (!selected) return;
    await sendJson(`/api/events/${selected.id}/activity-timer`, "PATCH", {
      visible,
    });
    void loadOverview();
  }

  async function toggleSwitch(
    name: "chat" | "submissions" | "joins",
    value: boolean,
  ) {
    if (!selected) return;
    const res = await sendJson(`/api/events/${selected.id}/switches`, "PATCH", {
      [name]: value,
    });
    if (!res.ok) {
      const err = await readApiError(res);
      toast("err", errorMessage(err?.error, tCommon("errors.INTERNAL_ERROR")));
      return;
    }
    void loadOverview();
  }

  async function enviarAviso() {
    if (!selected || !announcementInput.trim()) return;
    const text = announcementInput.trim();
    const res = await sendJson(
      `/api/events/${selected.id}/announcements`,
      "POST",
      {
        text,
      },
    );
    if (!res.ok) {
      const err = await readApiError(res);
      toast("err", errorMessage(err?.error, tCommon("errors.INTERNAL_ERROR")));
      return;
    }
    setAnnouncementInput("");
    void loadOverview();
  }

  async function removerAviso(id: string) {
    if (!selected) return;
    await sendJson(`/api/events/${selected.id}/announcements/${id}`, "DELETE");
    void loadOverview();
  }

  async function gerarCodigoMentores() {
    if (!selected) return;
    const res = await sendJson(
      `/api/events/${selected.id}/mentor-code`,
      "POST",
    );
    if (!res.ok) {
      const err = await readApiError(res);
      toast("err", errorMessage(err?.error, tCommon("errors.INTERNAL_ERROR")));
      return;
    }
    void loadOverview();
  }

  async function removerMentor(mentorId: string) {
    if (!selected) return;
    if (confirmingMentorId !== mentorId) {
      setConfirmingMentorId(mentorId);
      return;
    }
    setConfirmingMentorId(null);
    const res = await sendJson(
      `/api/events/${selected.id}/mentors/${mentorId}`,
      "DELETE",
    );
    if (!res.ok && res.status !== 204) {
      const err = await readApiError(res);
      toast("err", errorMessage(err?.error, tCommon("errors.INTERNAL_ERROR")));
      return;
    }
    toast("ok", t("mentores.removido"));
    const refreshed = await fetch(`/api/events/${selected.id}/evaluations`);
    const body = (await refreshed.json().catch(() => null)) as
      typeof evaluations | null;
    if (refreshed.ok && body) setEvaluations(body);
  }

  async function abrirEvaluacoes() {
    if (!selected) return;
    const res = await fetch(`/api/events/${selected.id}/evaluations`);
    const body = (await res.json().catch(() => null)) as typeof evaluations;
    if (res.ok && body) {
      setEvaluations(body);
      setShowMentores(true);
    }
  }

  function exportar(type: "report" | "proposals" | "activity") {
    if (!selected) {
      toast("err", t("toasts.selecioneSessao"));
      return;
    }
    window.open(`/api/events/${selected.id}/export?type=${type}`, "_blank");
  }

  function alertText(alert: OverviewAlert): string {
    if (alert.type === "CUSTOM") return alert.message;
    const team = alert.team?.name ?? "";
    const minutes = alert.minutes ?? 0;
    return t(`alertas.${alert.type}`, { team, minutes });
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
    <div
      id="tela-educador"
      className={`min-h-screen bg-[var(--ag-color-background,#04151f)] ${AG_TEXT}`}
    >
      <div
        className={`topbar ${AG_SIDEBAR} backdrop-blur-2xl border-b ${AG_BORDER}`}
      >
        <div className="tb-logo">
          <div className="tb-gem transition-all duration-300 shadow-[0_0_16px_-3px_rgba(0,245,212,0.4)]">
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
              className={`btn btn-sm ${AG_START_BTN}`}
              onClick={handleSessionAction}
            >
              ▶ {t(`acao.${NEXT_STATUS[selected.status]?.actionKey}`)}
            </button>
          )}
          <button
            className="btn btn-sm"
            style={{
              background: "var(--ag-color-accent, #00f5d4)",
              color: "var(--ag-color-on-accent, #031924)",
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
        <div
          className={`sidebar ${AG_SIDEBAR} backdrop-blur-2xl border-r ${AG_BORDER}`}
        >
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
                className={`eq-item transition-all duration-200 ${AG_HOVER} hover:translate-x-1 ${s.id === selectedId ? "on" : ""}`}
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
            className={`sidebar-action rounded-[12px] mx-1.5 transition-all duration-200 ${AG_HOVER} hover:text-[#00F5D4] hover:translate-x-0.5`}
            onClick={() => setShowCreate(true)}
          >
            ＋ {t("sidebar.novaSessao")}
          </div>
          <div
            className={`sidebar-action rounded-[12px] mx-1.5 transition-all duration-200 ${AG_HOVER} hover:text-[#00F5D4] hover:translate-x-0.5`}
            onClick={handleVerificarAlertas}
          >
            🔔 {t("sidebar.verificarAlertas")}
          </div>
          <div
            className={`sidebar-action rounded-[12px] mx-1.5 transition-all duration-200 ${AG_HOVER} hover:text-[#00F5D4] hover:translate-x-0.5`}
            onClick={handleSocializar}
          >
            ↗ {t("socializar")}
          </div>
          <div
            className={`sidebar-action rounded-[12px] mx-1.5 transition-all duration-200 ${AG_HOVER} hover:text-[#00F5D4] hover:translate-x-0.5`}
            onClick={() => void abrirEvaluacoes()}
          >
            🎓 {t("sidebar.mentores")}
          </div>
          <div className="sidebar-divider" />
          <div className="sidebar-sec">{t("sidebar.exportar")}</div>
          <div
            className={`sidebar-action rounded-[12px] mx-1.5 transition-all duration-200 ${AG_HOVER} hover:text-[#00F5D4] hover:translate-x-0.5`}
            onClick={() => exportar("report")}
          >
            📋 {t("sidebar.relatorio")}
          </div>
          <div
            className={`sidebar-action rounded-[12px] mx-1.5 transition-all duration-200 ${AG_HOVER} hover:text-[#00F5D4] hover:translate-x-0.5`}
            onClick={() => exportar("proposals")}
          >
            📄 {t("sidebar.exportarPropostas")}
          </div>
          <div
            className={`sidebar-action rounded-[12px] mx-1.5 transition-all duration-200 ${AG_HOVER} hover:text-[#00F5D4] hover:translate-x-0.5`}
            onClick={() => exportar("activity")}
          >
            🗒 {t("sidebar.exportarAtividade")}
          </div>
          <div
            className={`sidebar-action rounded-[12px] mx-1.5 transition-all duration-200 ${AG_HOVER} hover:text-[#00F5D4] hover:translate-x-0.5`}
            onClick={() => router.push("/")}
          >
            ← {t("sair")}
          </div>
        </div>

        <div className="edu-main">
          <div className="metrics">
            <div
              className={`metric-card ${AG_CARD} transition-all duration-300 hover:-translate-y-1 hover:border-[#2DD4BF]/50 hover:shadow-[0_12px_32px_-8px_rgba(45,212,191,0.28)]`}
            >
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
            <div
              className={`metric-card ${AG_CARD} transition-all duration-300 hover:-translate-y-1 hover:border-[#00F5D4]/50 hover:shadow-[0_12px_32px_-8px_rgba(0,245,212,0.28)]`}
            >
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
            <div
              className={`metric-card ${AG_CARD} transition-all duration-300 hover:-translate-y-1 hover:border-[#38BDF8]/50 hover:shadow-[0_12px_32px_-8px_rgba(56,189,248,0.28)]`}
            >
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
            <div
              className={`metric-card ${AG_CARD} transition-all duration-300 hover:-translate-y-1 hover:border-[#00BBF9]/50 hover:shadow-[0_12px_32px_-8px_rgba(0,187,249,0.28)]`}
            >
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
                  className={`prog-card ${AG_CARD} transition-all duration-300 hover:-translate-y-1 hover:border-[#00F5D4]/50 hover:shadow-[0_10px_28px_-6px_rgba(0,245,212,0.25)]`}
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
                className={`card card-pad ${AG_CARD}`}
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  borderStyle: "dashed",
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
                  <div
                    className={`eq-card ${AG_CARD} transition-all duration-300 hover:-translate-y-1 hover:border-[#00F5D4]/50 hover:shadow-[0_12px_32px_-8px_rgba(0,245,212,0.28)]`}
                    key={team.id}
                  >
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
                              : 0.25;
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
                          background: "var(--ag-color-surface-solid, #0c2d40)",
                          color: "var(--t3)",
                          borderColor: "var(--border)",
                        }}
                      >
                        {completed}/4 {t("equipeCard.chaves")}
                      </div>
                      <div
                        className="badge tiny"
                        style={{
                          background: "var(--ag-color-surface-solid, #0c2d40)",
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
                            background: "var(--prob-bg)",
                            color: "var(--prob)",
                            borderColor: "var(--prob-bd)",
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

        <div
          className={`edu-right ${AG_SIDEBAR} backdrop-blur-2xl border-l ${AG_BORDER}`}
        >
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
                    ? "var(--ag-color-warning, #fbbf24)"
                    : alert.severity === "WARNING"
                      ? "var(--gold)"
                      : "var(--opor)";
                const bg =
                  alert.severity === "CRITICAL"
                    ? "var(--gold-bg)"
                    : alert.severity === "WARNING"
                      ? "var(--gold-bg)"
                      : "var(--opor-bg)";
                const bd =
                  alert.severity === "CRITICAL"
                    ? "1.5px solid var(--gold-bd)"
                    : alert.severity === "WARNING"
                      ? "1.5px solid var(--gold-bd)"
                      : "1.5px solid var(--opor-bd)";
                const icon =
                  alert.severity === "CRITICAL"
                    ? "⚠"
                    : alert.severity === "WARNING"
                      ? "⏱"
                      : "★";
                return (
                  <div
                    key={alert.id}
                    className="alert-card rounded-[20px]"
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
                        {alertText(alert)}
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
              className={`ctrl-btn ${AG_START_BTN} ${!canStart ? "opacity-45 pointer-events-none" : ""}`}
              onClick={() => canStart && changeStatus("ACTIVE")}
            >
              ▶ {t("right.iniciar")}
            </div>
            <div
              className={`ctrl-btn ${AG_SURFACE_SOLID} border ${AG_BORDER} rounded-[12px] ${AG_TEXT} transition-all duration-200 ${AG_HOVER} hover:border-[#00F5D4]/50 ${!canPause ? "opacity-45 pointer-events-none" : ""}`}
              onClick={() => canPause && changeStatus("PAUSED")}
            >
              ⏸ {t("right.pausar")}
            </div>
            <div
              className={`ctrl-btn ${AG_SURFACE_SOLID} border ${AG_BORDER} rounded-[12px] ${AG_TEXT} transition-all duration-200 ${AG_HOVER} hover:border-[#00F5D4]/50 ${!canResume ? "opacity-45 pointer-events-none" : ""}`}
              onClick={() => canResume && changeStatus("ACTIVE")}
            >
              ↺ {t("right.retomar")}
            </div>
            <div
              className={`ctrl-btn ${AG_SURFACE_SOLID} border ${AG_BORDER} rounded-[12px] ${AG_TEXT} transition-all duration-200 ${AG_HOVER} hover:border-[#00F5D4]/50`}
              onClick={handleVerificarAlertas}
            >
              🔔 {t("right.alertas")}
            </div>
          </div>
          <div className="sidebar-divider" />
          <div className="panel-title">⏱ {t("timer.titulo")}</div>
          <div
            className={`timer-edu-block ${AG_SURFACE_FEATURED} backdrop-blur-xl border ${AG_BORDER} rounded-[20px] p-3 my-2`}
          >
            <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 4 }}>
              {t("timer.duracao")}
            </div>
            <div className="timer-presets">
              {ACTIVITY_PRESETS.map((min) => (
                <button
                  key={min}
                  className={`timer-preset-btn ${activityMinutes === min ? "sel" : ""}`}
                  onClick={() => setActivityMinutes(min)}
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
              {event?.activityTimer
                ? fmtClock(event.activityTimer.seconds)
                : "—"}
            </div>
            <div className="timer-ctrl-row">
              <button
                className={`timer-ctrl-btn timer-start ${AG_START_BTN}`}
                onClick={() => void iniciarTimer()}
              >
                ▶ {t("timer.iniciar")}
              </button>
              <button
                className="timer-ctrl-btn timer-stop bg-[#EF4444]/12 border border-[#EF4444]/35 text-[#EF4444] font-bold rounded-[12px] hover:bg-[#EF4444]/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.25)] transition-all"
                onClick={() => void pararTimer()}
              >
                ⏹ {t("timer.parar")}
              </button>
            </div>
            <div
              className={`timer-toggle-row ${AG_SIDEBAR} border ${AG_BORDER} rounded-[12px]`}
            >
              <span className="timer-toggle-lbl">
                {t("timer.mostrarEstudantes")}
              </span>
              <label className="toggle-sw">
                <input
                  type="checkbox"
                  checked={event?.activityTimer?.visible ?? false}
                  onChange={(e) => void toggleTimerVisible(e.target.checked)}
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
                  className={`carta-launcher-btn ${AG_SURFACE} backdrop-blur-2xl border ${AG_BORDER} rounded-[20px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-6px_rgba(0,245,212,0.25)]`}
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
          {event?.challengeCard && (
            <div
              className={`${AG_SURFACE_FEATURED} border ${AG_BORDER} rounded-[20px]`}
              style={{ marginTop: 8, padding: "10px 12px" }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--ag-color-accent,#00f5d4)",
                  marginBottom: 4,
                }}
              >
                🃏 {t("carta.ativa")}
              </div>
              <div style={{ fontSize: 11, color: "var(--t2)" }}>
                {event.challengeCard.text}
              </div>
              <button
                onClick={() => void removerCarta()}
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
          <div className="sidebar-divider" />
          <div className="panel-title">📢 {t("avisos.titulo")}</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              className={`${AG_SURFACE_SOLID} border ${AG_BORDER} rounded-[12px] ${AG_TEXT}`}
              style={{ flex: 1 }}
              placeholder={t("avisos.placeholder")}
              value={announcementInput}
              maxLength={1000}
              onChange={(e) => setAnnouncementInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void enviarAviso();
              }}
            />
            <button
              className={`btn btn-sm ${AG_START_BTN}`}
              onClick={() => void enviarAviso()}
            >
              {t("avisos.enviar")}
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 160,
              overflowY: "auto",
            }}
          >
            {(overview?.announcements ?? []).length === 0 && (
              <div style={{ fontSize: 11, color: "var(--t3)" }}>
                {t("avisos.vazio")}
              </div>
            )}
            {(overview?.announcements ?? []).map((a) => (
              <div
                key={a.id}
                className={`${AG_SURFACE_SOLID} border ${AG_BORDER} rounded-[12px]`}
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "flex-start",
                  padding: "6px 8px",
                  fontSize: 11,
                }}
              >
                <span style={{ flex: 1 }}>{a.text}</span>
                <button
                  onClick={() => void removerAviso(a.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="sidebar-divider" />
          <div className="panel-title">🚨 {t("interruptores.titulo")}</div>
          {(["chat", "submissions", "joins"] as const).map((name) => (
            <div
              key={name}
              className={`timer-toggle-row ${AG_SIDEBAR} border ${AG_BORDER} rounded-[12px]`}
              style={{ marginBottom: 6 }}
            >
              <span className="timer-toggle-lbl">
                {t(`interruptores.${name}`)}
              </span>
              <label className="toggle-sw">
                <input
                  type="checkbox"
                  checked={event?.switches[name] ?? true}
                  onChange={(e) => void toggleSwitch(name, e.target.checked)}
                />
                <div className="toggle-track" />
                <div className="toggle-thumb" />
              </label>
            </div>
          ))}
          <div className="sidebar-divider" />
          <div className="panel-title">🎓 {t("mentores.titulo")}</div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 6 }}>
            {event?.mentorCode ? (
              <>
                {t("mentores.codigo")}:{" "}
                <strong style={{ color: "var(--ag-color-accent,#00f5d4)" }}>
                  {event.mentorCode}
                </strong>
              </>
            ) : (
              t("mentores.semCodigo")
            )}
          </div>
          <button
            className={`btn btn-sm w100 ${AG_SURFACE_SOLID} border ${AG_BORDER} rounded-[12px] ${AG_TEXT} ${AG_HOVER} hover:border-[#00F5D4]/50`}
            onClick={() => void gerarCodigoMentores()}
          >
            {event?.mentorCode ? t("mentores.regenerar") : t("mentores.gerar")}
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={(ev) => {
            const session = eventToSession(ev);
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
              maxLength={500}
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
            <button
              className={`btn ${AG_START_BTN}`}
              onClick={() => void confirmarEnvioCarta()}
            >
              🃏 {t("carta.enviar")}
            </button>
          </div>
        </Modal>
      )}

      {showMentores && evaluations && (
        <Modal onClose={() => setShowMentores(false)} maxWidth={520}>
          <h3>🎓 {t("mentores.titulo")}</h3>
          <p style={{ fontSize: 11, color: "var(--t3)" }}>
            {t("mentores.mentoresCount", { count: evaluations.mentors.length })}
          </p>

          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--t3)",
              marginTop: 14,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            {t("mentores.listaTitulo")}
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 14,
            }}
          >
            {evaluations.mentors.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--t3)" }}>
                {t("mentores.nenhumMentor")}
              </p>
            )}
            {evaluations.mentors.map((mentor) => (
              <div
                key={mentor.id}
                className={`${AG_SURFACE_SOLID} border ${AG_BORDER} rounded-[12px]`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  fontSize: 12,
                  gap: 8,
                }}
              >
                <span>
                  {mentor.name}{" "}
                  <span style={{ color: "var(--t3)", fontSize: 11 }}>
                    ({mentor.evaluated})
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{
                    color: "var(--prob,#ff5c5c)",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => void removerMentor(mentor.id)}
                  onBlur={() => setConfirmingMentorId(null)}
                >
                  {confirmingMentorId === mentor.id
                    ? t("mentores.removerConfirmar")
                    : t("mentores.remover")}
                </button>
              </div>
            ))}
          </div>

          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--t3)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            {t("mentores.equiposTitulo")}
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 360,
              overflowY: "auto",
            }}
          >
            {evaluations.teams.map((team) => (
              <div
                key={team.id}
                className={`${AG_SURFACE_SOLID} border ${AG_BORDER} rounded-[12px]`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  fontSize: 12,
                }}
              >
                <span>{team.name}</span>
                <span
                  style={{
                    color: "var(--ag-color-accent,#00f5d4)",
                    fontWeight: 700,
                  }}
                >
                  {team.summary.average !== null
                    ? `${team.summary.average.toFixed(1)} (${team.summary.count})`
                    : t("mentores.semNota")}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showExtensoes && (
        <Modal onClose={() => setShowExtensoes(false)} maxWidth={440}>
          <h3>☕ {t("extensoes")}</h3>
          <p>{t("extensoesModal.subtitulo")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["desafiosExtras", "coringas", "cartasPedagogicas"] as const).map(
              (id) => (
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
                  <div
                    style={{ fontSize: 10, color: "var(--t3)", marginTop: 3 }}
                  >
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
              ),
            )}
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
