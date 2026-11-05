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
  type KeyTranslation,
} from "@/features/event/keys";
import { CreateSessionModal } from "./CreateSessionModal";

export type SessionStatus = "aguardando" | "ativa" | "pausada";

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

const NEXT_STATUS: Record<
  SessionStatus,
  { next: SessionStatus; actionKey: "iniciar" | "pausar" | "retomar" }
> = {
  aguardando: { next: "ativa", actionKey: "iniciar" },
  ativa: { next: "pausada", actionKey: "pausar" },
  pausada: { next: "ativa", actionKey: "retomar" },
};

const AVATAR_COLORS = ["#2E80F0", "#22C97A", "#A040E0", "#0FD4B0", "#F0BC40"];

export function EducadorPanel() {
  const t = useTranslations("educador");
  const tKeys = useTranslations("keys");
  const toast = useToast();
  const router = useRouter();

  const [sessions, setSessions] = useState<EduSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
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

  function handleSessionAction() {
    if (!selected) {
      toast("err", t("toasts.selecioneSessao"));
      return;
    }
    const { next } = NEXT_STATUS[selected.status];
    setSessions((prev) =>
      prev.map((s) => (s.id === selected.id ? { ...s, status: next } : s)),
    );
    toast("ok", t(`status.${next}`));
  }

  function handleVerificarAlertas() {
    if (!selected) {
      toast("err", t("toasts.selecioneSessao"));
      return;
    }
    toast("ok", t("toasts.nenhumAlertaNovo"));
  }

  function handlePending(label: string) {
    toast("info", label);
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
            onClick={() => handlePending(t("extensoes"))}
          >
            ☕ {t("extensoes")}
          </button>
          <button
            className="btn btn-sm"
            style={{
              background: "var(--parc-bg)",
              color: "var(--parc)",
              border: "1.5px solid var(--parc-bd)",
            }}
            onClick={handleSessionAction}
          >
            ▶{" "}
            {selected
              ? t(`acao.${NEXT_STATUS[selected.status].actionKey}`)
              : t("acao.iniciar")}
          </button>
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
                {selected ? selected.numEquipes : "—"}
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
              <div className="m-val">0</div>
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
                0
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
                    <div className="pc-ct">0/{selected?.numEquipes ?? 0}</div>
                  </div>
                  <div className="pc-bar">
                    <div
                      className="pc-fill"
                      style={{
                        width: "0%",
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
          </div>
        </div>

        <div className="edu-right bg-white/[0.03] backdrop-blur-xl border-l border-white/10">
          <div className="panel-title">{t("right.alertasMediacao")}</div>
          <div style={{ fontSize: 11, color: "var(--t3)" }}>
            {t("right.nenhumAlerta")}
          </div>
          <div className="sidebar-divider" />
          <div className="panel-title">{t("right.controlesSessao")}</div>
          <div className="ctrl-grid">
            <div
              className="ctrl-btn bg-white/5 backdrop-blur-md border-white/10 transition-all duration-200 hover:border-neon-lime/40 hover:text-white hover:shadow-glow-lime"
              onClick={handleSessionAction}
            >
              ▶ {t("right.iniciar")}
            </div>
            <div
              className="ctrl-btn bg-white/5 backdrop-blur-md border-white/10 transition-all duration-200 hover:border-neon-amber/40 hover:text-white hover:shadow-glow-amber"
              onClick={handleSessionAction}
            >
              ⏸ {t("right.pausar")}
            </div>
            <div
              className="ctrl-btn bg-white/5 backdrop-blur-md border-white/10 transition-all duration-200 hover:border-neon-cyan/40 hover:text-white hover:shadow-glow-cyan"
              onClick={handleSessionAction}
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
          onCreated={(session) => {
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
    </div>
  );
}
