"use client";

import { useState, type FormEvent } from "react";
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
import { RolePickerModal } from "./RolePickerModal";
import { SubmissionModal, type SubmissionData } from "./SubmissionModal";
import {
  RPG_ROLE_COLOR,
  RPG_ROLE_ICON,
  type RpgRoleId,
  type RpgRoleTranslation,
} from "./rpgRoles";

type PhaseStatus = "bloqueada" | "disponivel" | "concluida";
type KeyStatus = "disponivel" | "ativa" | "concluida";

interface PhaseState {
  status: PhaseStatus;
  conteudo?: string;
}

interface KeyState {
  status: KeyStatus;
  phases: Record<number, PhaseState>;
}

const PONTOS_POR_CHAVE = 60;
const TOTAL_FASES = 3;
const DEPENDENTES: KeyId[] = ["solucao", "parcerias", "oportunidades"];

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#1A9055,#0F5E38)",
  "linear-gradient(135deg,#1A4E9E,#0F3370)",
  "linear-gradient(135deg,#6A28A0,#441870)",
  "linear-gradient(135deg,#E8A830,#C4891A)",
];

function initialKeys(): Record<KeyId, KeyState> {
  const keys = {} as Record<KeyId, KeyState>;
  for (const id of KEY_IDS) {
    // Solução/Parcerias/Oportunidades depend on Problema being completed
    // first (enforced in ativarChave/abrirFase) — their phase 1 must start
    // locked, otherwise a player could open and submit it directly from the
    // card without ever clearing that dependency.
    const startsUnlocked = !DEPENDENTES.includes(id);
    keys[id] = {
      status: "disponivel",
      phases: {
        1: { status: startsUnlocked ? "disponivel" : "bloqueada" },
        2: { status: "bloqueada" },
        3: { status: "bloqueada" },
      },
    };
  }
  return keys;
}

type LogType = "balao" | "sussurro" | "cutucar" | "sistema";

interface LogEvent {
  id: number;
  type: LogType;
  nome: string;
  texto: string;
  proprio: boolean;
}

let nextLogId = 1;

export function PlayerBoard({ nickname = "" }: { nickname?: string }) {
  const t = useTranslations("jogador");
  const tKeys = useTranslations("keys");
  const tRoles = useTranslations("rpgPapeis");
  const toast = useToast();
  const router = useRouter();

  const [score, setScore] = useState(0);
  const [keys, setKeys] = useState<Record<KeyId, KeyState>>(initialKeys);
  const [openPhase, setOpenPhase] = useState<{
    keyId: KeyId;
    numero: number;
    nome: string;
  } | null>(null);
  const [phaseContent, setPhaseContent] = useState("");
  const [congrats, setCongrats] = useState<{
    titulo: string;
    sub: string;
    pontos: number | null;
  } | null>(null);
  const [commTab, setCommTab] = useState<"equipe" | "individual" | "registro">(
    "equipe",
  );
  const [log, setLog] = useState<LogEvent[]>([]);
  const [balaoInput, setBalaoInput] = useState("");
  const [sussurroTo, setSussurroTo] = useState<string | null>(null);
  const [sussurroInput, setSussurroInput] = useState("");
  const [role, setRole] = useState<RpgRoleId | null>(null);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const tSubmission = useTranslations("submission");

  const activeKey = KEY_IDS.find((id) => keys[id].status === "ativa") ?? null;
  const allDone = KEY_IDS.every((id) => keys[id].status === "concluida");

  const members = [nickname || "Você", "Ana", "Bruno", "Carla"];
  const baloes = log.filter((l) => l.type === "balao");

  function ativarChave(keyId: KeyId) {
    if (DEPENDENTES.includes(keyId) && keys.problema.status !== "concluida") {
      toast("err", t("chave.bloqueadaPorProblema"));
      return;
    }
    setKeys((prev) => {
      const next = { ...prev };
      for (const id of KEY_IDS) {
        if (next[id].status === "ativa")
          next[id] = { ...next[id], status: "disponivel" };
      }
      next[keyId] = {
        status: "ativa",
        phases: {
          1: { status: "disponivel" },
          2: { status: "bloqueada" },
          3: { status: "bloqueada" },
        },
      };
      return next;
    });
  }

  function abrirFase(keyId: KeyId, numero: number) {
    // Defense in depth: even if a phase's own status were ever left
    // "disponivel" by mistake, the Problema dependency must still hold.
    if (DEPENDENTES.includes(keyId) && keys.problema.status !== "concluida") {
      toast("err", t("chave.bloqueadaPorProblema"));
      return;
    }
    const phase = keys[keyId].phases[numero] ?? {
      status: "bloqueada" as const,
    };
    if (phase.status === "bloqueada") return;
    const nome = (tKeys.raw(`${keyId}`) as unknown as { name: string }).name;
    setOpenPhase({
      keyId,
      numero,
      nome: t(`fases.${keyId}.${numero - 1}.nome`) || nome,
    });
    setPhaseContent(phase.conteudo ?? "");
  }

  function concluirFase(e: FormEvent) {
    e.preventDefault();
    if (!openPhase) return;
    if (!phaseContent.trim()) {
      toast("err", t("fase.vazio"));
      return;
    }
    const { keyId, numero } = openPhase;
    setKeys((prev) => {
      const next = { ...prev };
      const keyState = { ...next[keyId], phases: { ...next[keyId].phases } };
      keyState.phases[numero] = { status: "concluida", conteudo: phaseContent };
      const proxNum = numero + 1;
      if (proxNum <= TOTAL_FASES) {
        keyState.phases[proxNum] = { status: "disponivel" };
      } else {
        keyState.status = "concluida";
      }
      next[keyId] = keyState;
      return next;
    });

    const chaveConcluida = numero >= TOTAL_FASES;
    const chaveNome = (tKeys.raw(keyId) as unknown as { name: string }).name;
    if (chaveConcluida) {
      setScore((s) => s + PONTOS_POR_CHAVE);
      setCongrats({
        titulo: t("congrats.chaveConcluida"),
        sub: `${chaveNome} · ${t("congrats.todasFasesCompletas")}`,
        pontos: PONTOS_POR_CHAVE,
      });
    } else {
      setCongrats({
        titulo: t("congrats.faseConcluidaTpl", { numero }),
        sub: openPhase.nome,
        pontos: null,
      });
    }
    setLog((prev) => [
      ...prev,
      {
        id: nextLogId++,
        type: "sistema",
        nome: "Sistema",
        texto: t("comm2.faseConcluidaLog", {
          nome: openPhase.nome,
          chave: chaveNome,
        }),
        proprio: false,
      },
    ]);
    setOpenPhase(null);
  }

  function enviarBalao() {
    if (!balaoInput.trim()) return;
    setLog((prev) => [
      ...prev,
      {
        id: nextLogId++,
        type: "balao",
        nome: nickname || "Você",
        texto: balaoInput.trim(),
        proprio: true,
      },
    ]);
    setBalaoInput("");
  }

  function enviarSussurro() {
    if (!sussurroTo || !sussurroInput.trim()) return;
    setLog((prev) => [
      ...prev,
      {
        id: nextLogId++,
        type: "sussurro",
        nome: t("comm2.paraDestino", { nome: sussurroTo }),
        texto: sussurroInput.trim(),
        proprio: true,
      },
    ]);
    setSussurroInput("");
    toast("ok", t("comm.enviar"));
  }

  function cutucar(memberName: string) {
    setLog((prev) => [
      ...prev,
      {
        id: nextLogId++,
        type: "cutucar",
        nome: t("comm2.cutucou", { nome: memberName }),
        texto: "",
        proprio: true,
      },
    ]);
    toast("ok", t("comm2.cutucou", { nome: memberName }));
  }

  return (
    <div id="tela-jogadores">
      <div className="topbar bg-neon-bg/80 backdrop-blur-xl border-b border-white/10">
        <div className="tb-logo">
          <div className="tb-gem backdrop-blur-md transition-all duration-300 hover:shadow-glow-amber">
            <GemLogo size={14} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {t("topbarTitulo")}
          </span>
        </div>
        <div className="tb-sep" />
        <div className="tb-right" style={{ marginLeft: "auto" }}>
          <div
            className="badge"
            style={{
              background: "var(--sol-bg)",
              color: "var(--sol)",
              borderColor: "var(--sol-bd)",
            }}
          >
            {activeKey
              ? (tKeys.raw(activeKey) as KeyTranslation).name
              : t("semChaveAtiva")}
          </div>
          <LangSwitcher />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/")}
          >
            {t("sair")}
          </button>
        </div>
      </div>

      <div className="score-strip bg-white/[0.03] backdrop-blur-md border-b border-white/10">
        <div>
          <div className="score-label">{t("score.label")}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <div className="score-val">{score}</div>
            <div className="score-pts">{t("score.unidade")}</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowSubmission(true)}
        >
          {submission ? tSubmission("editar") : tSubmission("abrir")}
        </button>
        {allDone && (
          <button
            className="btn btn-sm"
            style={{
              background: "rgba(255,215,0,.15)",
              color: "var(--gold)",
              border: "1px solid rgba(255,215,0,.35)",
            }}
            onClick={() =>
              toast(
                "ok",
                `${t("score.verResumo")}: ${score} ${t("score.unidade")}`,
              )
            }
          >
            🏆 {t("score.verResumo")}
          </button>
        )}
      </div>

      <div className="jog-layout">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="cenario-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:border-neon-cyan/40 hover:shadow-glow-cyan">
            <div className="cen-icon">⌖</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {t("cenario.titulo")}
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                {t("cenario.sub")}
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".07em",
                textTransform: "uppercase",
                color: "var(--t3)",
                marginBottom: 8,
              }}
            >
              {t("membros.titulo")}
            </div>
            <div className="membros-grid">
              {members.map((name, i) => {
                const roleInfo =
                  i === 0 && role
                    ? (tRoles.raw(role) as RpgRoleTranslation)
                    : null;
                return (
                  <div
                    key={name}
                    className={`membro-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-lime/40 hover:shadow-glow-lime ${i === 0 ? "ativo" : ""}`}
                    style={{ position: "relative" }}
                  >
                    {i !== 0 && (
                      <div
                        className="cutucar-btn"
                        title={t("comm2.cutucarTitle")}
                        onClick={() => cutucar(name)}
                      >
                        👆
                      </div>
                    )}
                    <div
                      className="membro-av"
                      style={{
                        background:
                          roleInfo && role
                            ? RPG_ROLE_COLOR[role]
                            : AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
                      }}
                    >
                      {role && i === 0
                        ? RPG_ROLE_ICON[role]
                        : name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="membro-nm">{name}</div>
                    <div
                      className="membro-st"
                      style={i === 0 ? { color: "var(--parc)" } : undefined}
                    >
                      {roleInfo ? roleInfo.nome : `● ${t("membros.ativo")}`}
                    </div>
                    {i === 0 && (
                      <div
                        style={{
                          fontSize: 8,
                          color: "var(--parc)",
                          marginTop: 3,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        onClick={() => setShowRolePicker(true)}
                      >
                        {t("membros.voce")} ·{" "}
                        {role ? t("rpg.trocarPapel") : t("rpg.escolherTitulo")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card card-pad bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:border-white/20">
            <div className="comm-tabs">
              <div
                className={`comm-tab ${commTab === "equipe" ? "on" : ""}`}
                onClick={() => setCommTab("equipe")}
              >
                📢 {t("comm.equipe")}
              </div>
              <div
                className={`comm-tab ${commTab === "individual" ? "on" : ""}`}
                onClick={() => setCommTab("individual")}
              >
                💬 {t("comm.individual")}
              </div>
              <div
                className={`comm-tab ${commTab === "registro" ? "on" : ""}`}
                onClick={() => setCommTab("registro")}
              >
                📋 {t("comm.registro")}
              </div>
            </div>

            {commTab === "equipe" && (
              <div className="comm-content on">
                <div className="baloes-lista">
                  {baloes.length === 0 && (
                    <div style={{ fontSize: 11, color: "var(--t3)" }}>
                      {t("comm.semMensagens")}
                    </div>
                  )}
                  {baloes.map((b) => (
                    <div
                      key={b.id}
                      className={`balao ${b.proprio ? "balao-proprio" : "balao-outro"}`}
                    >
                      <div className="balao-nm">{b.nome}</div>
                      <div className="balao-txt">{b.texto}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,.05)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 9,
                      padding: "9px 13px",
                      fontSize: 12,
                      color: "var(--t1)",
                    }}
                    placeholder={t("comm.placeholderEquipe")}
                    value={balaoInput}
                    onChange={(e) => setBalaoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") enviarBalao();
                    }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={enviarBalao}
                  >
                    ↑
                  </button>
                </div>
              </div>
            )}

            {commTab === "individual" && (
              <div className="comm-content on">
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--t3)",
                    textTransform: "uppercase",
                    letterSpacing: ".07em",
                    fontWeight: 700,
                  }}
                >
                  {t("comm.paraQuem")}
                </div>
                <div className="membros-chips">
                  {members.slice(1).map((name) => (
                    <div
                      key={name}
                      className={`mchip ${sussurroTo === name ? "sel" : ""}`}
                      onClick={() => setSussurroTo(name)}
                    >
                      {name}
                    </div>
                  ))}
                </div>
                <textarea
                  style={{
                    background: "rgba(255,255,255,.05)",
                    border: "1.5px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 13px",
                    fontSize: 12,
                    color: "var(--t1)",
                    resize: "none",
                    height: 70,
                    width: "100%",
                  }}
                  placeholder={t("comm.placeholderIndividual")}
                  value={sussurroInput}
                  onChange={(e) => setSussurroInput(e.target.value)}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--t3)",
                      flex: 1,
                      fontStyle: "italic",
                    }}
                  >
                    {t("comm.soDestinatario")}
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={enviarSussurro}
                    disabled={!sussurroTo}
                  >
                    {t("comm.enviar")}
                  </button>
                </div>
              </div>
            )}

            {commTab === "registro" && (
              <div className="comm-content on">
                <div className="chat-body">
                  {log.length === 0 && (
                    <div style={{ fontSize: 11, color: "var(--t3)" }}>
                      {t("comm.semMensagens")}
                    </div>
                  )}
                  {log.map((b) => (
                    <div key={b.id} className={`chat-msg chat-${b.type}`}>
                      <div className="chat-bubble">
                        <div className="chat-nm">{b.nome}</div>
                        {b.texto && <div className="chat-txt">{b.texto}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--t3)",
                    paddingTop: 6,
                    borderTop: ".5px solid var(--border)",
                  }}
                >
                  {t("comm.historico")}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="chaves-grid">
            {KEY_IDS.map((id) => {
              const key = keys[id];
              const keyInfo = tKeys.raw(id) as KeyTranslation;
              const colorVar = `var(${KEY_COLOR_VAR[id]})`;
              const concluida = key.status === "concluida";
              const ativa = key.status === "ativa";
              const disponivel = key.status === "disponivel";
              const bloqueadaPorProblema =
                DEPENDENTES.includes(id) &&
                keys.problema.status !== "concluida";
              const badgeTxt = concluida
                ? t("chave.concluida")
                : ativa
                  ? t("chave.ativa")
                  : disponivel && !bloqueadaPorProblema
                    ? t("chave.disponivel")
                    : t("chave.padrao");
              const pct = Math.round(
                (Object.values(key.phases).filter(
                  (p) => p.status === "concluida",
                ).length /
                  TOTAL_FASES) *
                  100,
              );

              const hoverGlowClass =
                id === "problema"
                  ? "hover:shadow-glow-amber hover:ring-1 hover:ring-neon-amber/40"
                  : id === "solucao"
                    ? "hover:shadow-glow-lime hover:ring-1 hover:ring-neon-lime/40"
                    : id === "parcerias"
                      ? "hover:shadow-glow-purple hover:ring-1 hover:ring-neon-purple/40"
                      : "hover:shadow-glow-cyan hover:ring-1 hover:ring-neon-cyan/40";

              return (
                <div
                  key={id}
                  className={`chave-card bg-white/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${hoverGlowClass}`}
                  style={{
                    background: concluida
                      ? `var(${KEY_COLOR_VAR[id]}-bg)`
                      : ativa
                        ? `var(${KEY_COLOR_VAR[id]}-bg)`
                        : "rgba(255,255,255,.04)",
                    borderColor:
                      concluida || ativa
                        ? `var(${KEY_COLOR_VAR[id]}-bd)`
                        : "rgba(255,255,255,.1)",
                  }}
                >
                  <div className="cc-head">
                    <div
                      className="cc-icon"
                      style={{ background: `var(${KEY_COLOR_VAR[id]}-bg)` }}
                    >
                      {keyInfo.icon}
                    </div>
                    <div
                      className="cc-name"
                      style={{
                        color:
                          concluida || ativa || disponivel
                            ? colorVar
                            : "rgba(255,255,255,.4)",
                      }}
                    >
                      {keyInfo.name}
                    </div>
                    <div
                      className="cc-badge"
                      style={{
                        marginLeft: "auto",
                        background: concluida
                          ? `var(${KEY_COLOR_VAR[id]}-bg)`
                          : ativa
                            ? "var(--gold-bg)"
                            : "rgba(255,255,255,.05)",
                        color: concluida
                          ? colorVar
                          : ativa
                            ? "var(--gold)"
                            : "var(--t3)",
                        borderColor: concluida
                          ? `var(${KEY_COLOR_VAR[id]}-bd)`
                          : ativa
                            ? "var(--gold-bd)"
                            : "var(--border)",
                      }}
                    >
                      {badgeTxt}
                    </div>
                  </div>
                  <div className="cc-fases">
                    {[1, 2, 3].map((numero) => {
                      const phase = key.phases[numero] ?? {
                        status: "bloqueada" as const,
                      };
                      const done = phase.status === "concluida";
                      const locked = phase.status === "bloqueada";
                      const active = !done && !locked;
                      const nome = t(`fases.${id}.${numero - 1}.nome`);
                      return (
                        <div
                          key={numero}
                          className={`cc-fase backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:translate-x-0.5 ${done ? "done" : ""} ${active ? "active" : ""} ${locked ? "locked" : ""}`}
                          style={
                            active
                              ? { borderColor: `var(${KEY_COLOR_VAR[id]}-bd)` }
                              : undefined
                          }
                          onClick={() => abrirFase(id, numero)}
                        >
                          <div
                            className="cc-fnum"
                            style={{
                              background: done
                                ? colorVar
                                : active
                                  ? `var(${KEY_COLOR_VAR[id]}-bg)`
                                  : "rgba(255,255,255,.08)",
                              color: done
                                ? "#fff"
                                : active
                                  ? colorVar
                                  : "var(--t3)",
                            }}
                          >
                            {done ? "✓" : numero}
                          </div>
                          <div
                            className="cc-fnm"
                            style={{
                              color: done
                                ? "var(--t2)"
                                : active
                                  ? "var(--t1)"
                                  : "var(--t3)",
                            }}
                          >
                            {nome}
                          </div>
                          <div className="cc-ftxt">
                            {done
                              ? "✓"
                              : active
                                ? t("chave.clique")
                                : t("chave.bloqueada")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cc-prog-bar">
                    <div
                      className="cc-prog-fill"
                      style={{ width: `${pct}%`, background: colorVar }}
                    />
                  </div>
                  {!concluida && !ativa && !bloqueadaPorProblema && (
                    <button
                      className="btn btn-primary w100 btn-sm"
                      style={{ marginTop: 8 }}
                      onClick={() => ativarChave(id)}
                    >
                      {t("chave.iniciar", { nome: keyInfo.name })}
                    </button>
                  )}
                  {!concluida && !ativa && bloqueadaPorProblema && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 10,
                        color: "var(--t3)",
                        textAlign: "center",
                        padding: 6,
                        background: "rgba(255,255,255,.03)",
                        borderRadius: 6,
                        border: "1px dashed rgba(255,255,255,.08)",
                      }}
                    >
                      {t("chave.bloqueadaPorProblema")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {openPhase && (
        <Modal onClose={() => setOpenPhase(null)} maxWidth={560}>
          <h3>
            {t("fase.tituloModal", {
              numero: openPhase.numero,
              nome: openPhase.nome,
            })}
          </h3>
          <p>
            {t(`fases.${openPhase.keyId}.${openPhase.numero - 1}.pergunta`)}
          </p>
          <form onSubmit={concluirFase}>
            <div className="field">
              <label>{t("fase.label")}</label>
              <textarea
                style={{ height: 100, resize: "vertical" }}
                placeholder={t("fase.placeholder")}
                value={phaseContent}
                onChange={(e) => setPhaseContent(e.target.value)}
                autoFocus
              />
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpenPhase(null)}
              >
                {t("fase.cancelar")}
              </button>
              <button type="submit" className="btn btn-primary">
                {t("fase.concluir")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {congrats && (
        <div id="overlay-congrats">
          <div className="congrats-box">
            <div className="congrats-stars">
              <span className="congrats-star">⭐</span>
              <span className="congrats-star">🌟</span>
              <span className="congrats-star">⭐</span>
            </div>
            <div className="congrats-title">{congrats.titulo}</div>
            <div className="congrats-sub">{congrats.sub}</div>
            {congrats.pontos !== null && (
              <div className="congrats-pts-badge">
                +{congrats.pontos} {t("congrats.pontos")}
              </div>
            )}
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setCongrats(null)}
            >
              {t("congrats.continuar")}
            </button>
          </div>
        </div>
      )}

      {showRolePicker && (
        <RolePickerModal
          onClose={() => setShowRolePicker(false)}
          onSelect={(r) => {
            setRole(r);
            setShowRolePicker(false);
          }}
        />
      )}

      {showSubmission && (
        <SubmissionModal
          onClose={() => setShowSubmission(false)}
          initial={submission}
          onSaved={setSubmission}
        />
      )}
    </div>
  );
}
