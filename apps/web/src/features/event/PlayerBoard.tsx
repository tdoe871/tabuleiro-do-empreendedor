"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
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
import { RolePickerModal } from "./RolePickerModal";
import { SubmissionModal } from "./SubmissionModal";
import {
  RPG_ROLE_COLOR,
  RPG_ROLE_ICON,
  type RpgRoleId,
  type RpgRoleTranslation,
} from "./rpgRoles";

// Shapes of GET /api/board and POST /api/messages (docs/backend/api.md,
// sections 3 and "Chat del equipo"). Both endpoints already return exactly
// what this screen needs, with the local naming (KeyId, PhaseStatus) the
// backend converts to/from.
type KeyStatus = "bloqueada" | "ativa" | "concluida";
type PhaseStatus = "bloqueada" | "disponivel" | "concluida";

interface PhaseState {
  status: PhaseStatus;
  conteudo?: string;
  completedAt?: string;
}

interface KeyState {
  status: KeyStatus;
  phases: Record<string, PhaseState>;
}

interface BoardMember {
  id: string;
  nickname: string;
  role: "LEADER" | "MEMBER";
  rpgRole: RpgRoleId | null;
}

export interface BoardFile {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  downloadUrl: string;
}

export interface BoardSubmission {
  type: "DEPLOY_LINK" | "REPO_LINK" | "FILE_OR_IMAGE" | "NONE";
  url: string | null;
  links: string[];
  description: string | null;
  submittedAt: string;
}

interface BoardAnnouncement {
  id: string;
  text: string;
  createdAt: string;
}

interface Board {
  serverNow: string;
  event: {
    code: string;
    name: string;
    status: "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
    playable: boolean;
    activityTimer: { endsAt: string; seconds: number; visible: boolean } | null;
    switches: { chat: boolean; submissions: boolean; joins: boolean };
  };
  team: { id: string; name: string; joinCode: string; score: number };
  me: BoardMember;
  members: BoardMember[];
  keys: Record<KeyId, KeyState>;
  cartaAtiva: { key: KeyId; text: string } | null;
  announcements: BoardAnnouncement[];
  submission: BoardSubmission | null;
  files: BoardFile[];
}

type MessageType = "TEAM" | "PRIVATE" | "NUDGE";

interface MessageDTO {
  id: number;
  type: MessageType;
  text: string | null;
  from: { id: string; nickname: string } | null;
  to: { id: string; nickname: string } | null;
  mine: boolean;
  clientId: string;
  createdAt: string;
}

const TOTAL_FASES = 3;
const ANNOUNCEMENTS_SEEN_KEY = "tdoe_last_announcement_seen";

// DRAFT / PAUSED get their own message; ACTIVE-but-not-playable means the
// 24h clock ran out, which reads the same to a player as "it's over".
function playableReasonKey(status: Board["event"]["status"]): string {
  if (status === "DRAFT") return "draft";
  if (status === "PAUSED") return "paused";
  return "finished";
}

function newClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function PlayerBoard() {
  const t = useTranslations("jogador");
  const tKeys = useTranslations("keys");
  const tRoles = useTranslations("rpgPapeis");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const router = useRouter();

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [openPhase, setOpenPhase] = useState<{
    keyId: KeyId;
    numero: number;
    nome: string;
  } | null>(null);
  const [phaseContent, setPhaseContent] = useState("");
  const [savingPhase, setSavingPhase] = useState(false);
  const [congrats, setCongrats] = useState<{
    titulo: string;
    sub: string;
    pontos: number | null;
  } | null>(null);
  const [commTab, setCommTab] = useState<"equipe" | "individual" | "registro">(
    "equipe",
  );
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const cursorRef = useRef<number | null>(null);
  const [balaoInput, setBalaoInput] = useState("");
  const [sussurroTo, setSussurroTo] = useState<string | null>(null);
  const [sussurroInput, setSussurroInput] = useState("");
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);
  const [showEncerramento, setShowEncerramento] = useState(false);
  const [showAvisos, setShowAvisos] = useState(false);
  const [activitySeconds, setActivitySeconds] = useState<number | null>(null);
  const prevTeamScore = useRef(0);

  const errorMessage = useCallback(
    (code: string | undefined, fallback: string) =>
      translateApiError(tCommon, code, fallback),
    [tCommon],
  );

  const loadBoard = useCallback(async () => {
    const res = await fetch("/api/board", { cache: "no-store" });
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const body = (await res.json().catch(() => null)) as Board | null;
    if (res.ok && body) {
      setBoard((prev) => {
        if (prev && body.team.score > prev.team.score) {
          prevTeamScore.current = prev.team.score;
        }
        return body;
      });
      setActivitySeconds(body.event.activityTimer?.seconds ?? null);
    }
    setLoading(false);
  }, [router]);

  const loadMessages = useCallback(
    async (after?: number) => {
      let next = after;
      let hasMore = true;
      while (hasMore) {
        const query = next !== undefined ? `?after=${next}` : "";
        const res = await fetch(`/api/messages${query}`, { cache: "no-store" });
        if (res.status === 401) {
          router.push("/");
          return;
        }
        const body = (await res.json().catch(() => null)) as {
          messages: MessageDTO[];
          hasMore: boolean;
          cursor: number | null;
        } | null;
        if (!res.ok || !body) return;
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const m of body.messages) byId.set(m.id, m);
          return [...byId.values()].sort((a, b) => a.id - b.id);
        });
        if (body.cursor !== null) {
          cursorRef.current = body.cursor;
          next = body.cursor;
        }
        hasMore = body.hasMore;
      }
    },
    [router],
  );

  useEffect(() => {
    void loadBoard();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a render-time update
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRealtime((signal) => {
    if (signal === "messages" || signal === "refresh") {
      void loadMessages(cursorRef.current ?? undefined);
    }
    if (signal !== "messages") void loadBoard();
  }, {});

  // Countdown for the activity timer, re-synced every time the board is
  // reloaded (it carries `seconds` as of `serverNow`, never trusting the
  // device clock for the starting point).
  useEffect(() => {
    if (activitySeconds === null) return;
    const interval = setInterval(() => {
      setActivitySeconds((s) => (s === null || s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [activitySeconds === null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !board) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--t3)",
          fontSize: 13,
        }}
      >
        {t("carregando")}
      </div>
    );
  }

  const activeKey =
    KEY_IDS.find((id) => board.keys[id].status === "ativa") ?? null;
  const allDone = KEY_IDS.every((id) => board.keys[id].status === "concluida");
  const lastSeenAnnouncement = Number(
    (typeof window !== "undefined" &&
      window.localStorage.getItem(ANNOUNCEMENTS_SEEN_KEY)) ||
      0,
  );
  const unseenCount = board.announcements.filter(
    (a) => new Date(a.createdAt).getTime() > lastSeenAnnouncement,
  ).length;

  const displayMembers = [
    { ...board.me, isMe: true },
    ...board.members.map((m) => ({ ...m, isMe: false })),
  ];
  const teamMessages = messages.filter((m) => m.type === "TEAM");
  const historyMessages = messages;

  function markAnnouncementsSeen() {
    const newest = board!.announcements[0];
    if (newest && typeof window !== "undefined") {
      window.localStorage.setItem(
        ANNOUNCEMENTS_SEEN_KEY,
        String(new Date(newest.createdAt).getTime()),
      );
    }
    setShowAvisos(true);
  }

  function abrirFase(keyId: KeyId, numero: number) {
    const key = board!.keys[keyId];
    if (key.status === "bloqueada") return;
    const phase = key.phases[String(numero)] ?? {
      status: "bloqueada" as const,
    };
    if (phase.status === "bloqueada") return;
    if (!board!.event.playable) {
      toast("err", t(`estado.${playableReasonKey(board!.event.status)}`));
      return;
    }
    const nomeFallback = (tKeys.raw(keyId) as unknown as { name: string }).name;
    setOpenPhase({
      keyId,
      numero,
      nome: t(`fases.${keyId}.${numero - 1}.nome`) || nomeFallback,
    });
    setPhaseContent(phase.conteudo ?? "");
  }

  async function concluirFase(e: FormEvent) {
    e.preventDefault();
    if (!openPhase) return;
    if (!phaseContent.trim()) {
      toast("err", t("fase.vazio"));
      return;
    }
    const { keyId, numero } = openPhase;
    const wasConcluida = board!.keys[keyId].status === "concluida";
    const prevScore = board!.team.score;
    setSavingPhase(true);
    try {
      const res = await sendJson(
        `/api/board/keys/${keyId}/phases/${numero}`,
        "PUT",
        { conteudo: phaseContent },
      );
      if (res.status === 401) {
        router.push("/");
        return;
      }
      if (!res.ok) {
        const err = await readApiError(res);
        toast(
          "err",
          errorMessage(err?.error, tCommon("errors.INTERNAL_ERROR")),
        );
        return;
      }
      const next = (await res.json()) as Board;
      setBoard(next);
      setActivitySeconds(next.event.activityTimer?.seconds ?? null);

      const chaveConcluida =
        !wasConcluida && next.keys[keyId].status === "concluida";
      const chaveNome = (tKeys.raw(keyId) as unknown as { name: string }).name;
      const gained = next.team.score - prevScore;
      if (chaveConcluida) {
        setCongrats({
          titulo: t("congrats.chaveConcluida"),
          sub: `${chaveNome} · ${t("congrats.todasFasesCompletas")}`,
          pontos: gained > 0 ? gained : null,
        });
      } else {
        setCongrats({
          titulo: t("congrats.faseConcluidaTpl", { numero }),
          sub: openPhase.nome,
          pontos: gained > 0 ? gained : null,
        });
      }
      setOpenPhase(null);
    } finally {
      setSavingPhase(false);
    }
  }

  async function selectRole(role: RpgRoleId) {
    setShowRolePicker(false);
    const res = await sendJson("/api/participants/me/rpg-role", "PUT", {
      rpgRole: role,
    });
    if (res.status === 401) {
      router.push("/");
      return;
    }
    if (!res.ok) {
      const err = await readApiError(res);
      toast("err", errorMessage(err?.error, tCommon("errors.INTERNAL_ERROR")));
      return;
    }
    setBoard((prev) =>
      prev ? { ...prev, me: { ...prev.me, rpgRole: role } } : prev,
    );
  }

  async function sendMessage(payload: Record<string, unknown>) {
    const res = await sendJson("/api/messages", "POST", {
      clientId: newClientId(),
      ...payload,
    });
    if (res.status === 401) {
      router.push("/");
      return false;
    }
    if (!res.ok) {
      const err = await readApiError(res);
      toast("err", errorMessage(err?.error, tCommon("errors.INTERNAL_ERROR")));
      return false;
    }
    const body = (await res.json()) as { message: MessageDTO };
    setMessages((prev) => {
      if (prev.some((m) => m.id === body.message.id)) return prev;
      return [...prev, body.message].sort((a, b) => a.id - b.id);
    });
    return true;
  }

  async function enviarBalao() {
    if (!balaoInput.trim()) return;
    const text = balaoInput.trim();
    setBalaoInput("");
    await sendMessage({ type: "TEAM", text });
  }

  async function enviarSussurro() {
    if (!sussurroTo || !sussurroInput.trim()) return;
    const text = sussurroInput.trim();
    setSussurroInput("");
    await sendMessage({ type: "PRIVATE", text, toParticipantId: sussurroTo });
  }

  async function cutucar(memberId: string, memberName: string) {
    const ok = await sendMessage({ type: "NUDGE", toParticipantId: memberId });
    if (ok) toast("ok", t("comm2.cutucou", { nome: memberName }));
  }

  function fmtClock(total: number) {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <div
      id="tela-jogadores"
      className="min-h-screen bg-[#0B0F19] text-slate-200"
    >
      <div className="topbar bg-[#0B0F19]/90 backdrop-blur-xl border-b border-white/5">
        <div className="tb-logo">
          <div className="tb-gem bg-[#151B2B]/90 backdrop-blur-md border border-white/10 transition-all duration-300 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            <GemLogo size={14} />
          </div>
          <span
            className="text-white"
            style={{ fontSize: 12, fontWeight: 700 }}
          >
            {t("topbarTitulo")}
          </span>
        </div>
        <div className="tb-sep bg-white/10" />
        <div className="tb-right" style={{ marginLeft: "auto" }}>
          {activitySeconds !== null && board.event.activityTimer?.visible && (
            <div
              className="badge"
              style={{
                background: "var(--gold-bg)",
                color: "var(--gold)",
                borderColor: "var(--gold-bd)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ⏱ {fmtClock(Math.max(0, activitySeconds))}
            </div>
          )}
          <button
            className="badge"
            style={{
              background: "var(--sol-bg)",
              color: "var(--sol)",
              borderColor: "var(--sol-bd)",
              cursor: "pointer",
              position: "relative",
            }}
            onClick={markAnnouncementsSeen}
          >
            🔔 {t("avisos.titulo")}
            {unseenCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  background: "#ef4444",
                  color: "#fff",
                  borderRadius: 999,
                  fontSize: 9,
                  padding: "1px 5px",
                  fontWeight: 800,
                }}
              >
                {unseenCount}
              </span>
            )}
          </button>
          <div
            className="badge"
            style={{
              background: "var(--prob-bg)",
              color: "var(--prob)",
              borderColor: "var(--prob-bd)",
            }}
          >
            {activeKey
              ? (tKeys.raw(activeKey) as KeyTranslation).name
              : t("semChaveAtiva")}
          </div>
          <LangSwitcher />
          <button
            className="btn btn-ghost btn-sm bg-none bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg transition-all"
            onClick={() => router.push("/")}
          >
            {t("sair")}
          </button>
        </div>
      </div>

      <div className="score-strip bg-[#151B2B]/90 backdrop-blur-xl border-b border-white/5">
        <div>
          <div className="score-label text-slate-400">{t("score.label")}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <div className="score-val text-white">{board.team.score}</div>
            <div className="score-pts text-slate-400">{t("score.unidade")}</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-ghost btn-sm bg-none bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg transition-all"
          onClick={() => setShowSubmission(true)}
        >
          {board.submission ? t("entregaEditar") : t("entregaAbrir")}
        </button>
        {allDone && (
          <button
            className="btn btn-sm bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
            onClick={() => setShowEncerramento(true)}
          >
            🏆 {t("score.verResumo")}
          </button>
        )}
      </div>

      {!board.event.playable && (
        <div
          style={{
            background: "rgba(239,68,68,.08)",
            borderBottom: "1px solid rgba(239,68,68,.25)",
            color: "#ef4444",
            fontSize: 11,
            textAlign: "center",
            padding: "6px 10px",
          }}
        >
          {t(`estado.${playableReasonKey(board.event.status)}`)}
        </div>
      )}

      {board.cartaAtiva && (
        <div
          className="bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10"
          style={{
            margin: "10px 20px 0",
            padding: "10px 14px",
          }}
        >
          <div
            className="text-[#818CF8]"
            style={{ fontSize: 10, fontWeight: 800 }}
          >
            🃏 {t("cartaAtiva.titulo")}
          </div>
          <div
            className="text-slate-300"
            style={{ fontSize: 12, marginTop: 2 }}
          >
            {board.cartaAtiva.text}
          </div>
        </div>
      )}

      <div className="jog-layout bg-[#0B0F19]">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="cenario-card bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10">
            <div className="cen-icon">⌖</div>
            <div>
              <div
                className="text-white"
                style={{ fontSize: 13, fontWeight: 700 }}
              >
                {t("cenario.titulo")}
              </div>
              <div
                className="text-slate-400"
                style={{ fontSize: 11, marginTop: 2 }}
              >
                {board.team.name} · {board.event.name}
              </div>
            </div>
          </div>

          <div>
            <div
              className="text-slate-400"
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".07em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {t("membros.titulo")}
            </div>
            <div className="membros-grid">
              {displayMembers.map((member) => {
                const roleInfo = member.rpgRole
                  ? (tRoles.raw(member.rpgRole) as RpgRoleTranslation)
                  : null;
                return (
                  <div
                    key={member.id}
                    className={`membro-card bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10 hover:-translate-y-0.5 ${member.isMe ? "ativo !border-[#6366F1]/50 shadow-[0_0_20px_rgba(79,70,229,0.2)]" : ""}`}
                    style={{ position: "relative" }}
                  >
                    {!member.isMe && (
                      <div
                        className="cutucar-btn"
                        title={t("comm2.cutucarTitle")}
                        onClick={() => cutucar(member.id, member.nickname)}
                      >
                        👆
                      </div>
                    )}
                    <div
                      className="membro-av"
                      style={{
                        background: member.rpgRole
                          ? RPG_ROLE_COLOR[member.rpgRole]
                          : "linear-gradient(135deg,#4F46E5,#6366F1)",
                      }}
                    >
                      {member.rpgRole
                        ? RPG_ROLE_ICON[member.rpgRole]
                        : member.nickname.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="membro-nm text-white">
                      {member.nickname}
                    </div>
                    <div
                      className="membro-st text-slate-400"
                      style={member.isMe ? { color: "#818CF8" } : undefined}
                    >
                      {roleInfo ? roleInfo.nome : `● ${t("membros.ativo")}`}
                    </div>
                    {member.isMe && (
                      <div
                        className="text-[#818CF8]"
                        style={{
                          fontSize: 8,
                          marginTop: 3,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        onClick={() => setShowRolePicker(true)}
                      >
                        {t("membros.voce")} ·{" "}
                        {member.rpgRole
                          ? t("rpg.trocarPapel")
                          : t("rpg.escolherTitulo")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card card-pad bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10">
            <div className="comm-tabs">
              <div
                className={`comm-tab ${commTab === "equipe" ? "on text-white" : "text-slate-400"}`}
                onClick={() => setCommTab("equipe")}
              >
                📢 {t("comm.equipe")}
              </div>
              <div
                className={`comm-tab ${commTab === "individual" ? "on text-white" : "text-slate-400"}`}
                onClick={() => setCommTab("individual")}
              >
                💬 {t("comm.individual")}
              </div>
              <div
                className={`comm-tab ${commTab === "registro" ? "on text-white" : "text-slate-400"}`}
                onClick={() => setCommTab("registro")}
              >
                📋 {t("comm.registro")}
              </div>
            </div>

            {commTab === "equipe" && (
              <div className="comm-content on">
                <div className="baloes-lista">
                  {teamMessages.length === 0 && (
                    <div className="text-slate-500" style={{ fontSize: 11 }}>
                      {t("comm.semMensagens")}
                    </div>
                  )}
                  {teamMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`balao ${m.mine ? "balao-proprio" : "balao-outro"}`}
                    >
                      <div className="balao-nm text-white">
                        {m.from?.nickname ?? t("comm.participanteSaiu")}
                      </div>
                      <div className="balao-txt text-slate-200">{m.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="flex-1 rounded-lg bg-[#0B0F19] border border-white/10 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-[#6366F1] focus:outline-none transition-all"
                    placeholder={t("comm.placeholderEquipe")}
                    value={balaoInput}
                    disabled={!board.event.switches.chat}
                    onChange={(e) => setBalaoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void enviarBalao();
                    }}
                  />
                  <button
                    className="btn btn-primary btn-sm bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                    disabled={!board.event.switches.chat}
                    onClick={() => void enviarBalao()}
                  >
                    ↑
                  </button>
                </div>
                {!board.event.switches.chat && (
                  <div
                    className="text-slate-500"
                    style={{ fontSize: 10, marginTop: 4 }}
                  >
                    {tCommon("errors.CHAT_DISABLED")}
                  </div>
                )}
              </div>
            )}

            {commTab === "individual" && (
              <div className="comm-content on">
                <div
                  className="text-slate-400"
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: ".07em",
                    fontWeight: 700,
                  }}
                >
                  {t("comm.paraQuem")}
                </div>
                <div className="membros-chips">
                  {board.members.map((member) => (
                    <div
                      key={member.id}
                      className={`mchip ${sussurroTo === member.id ? "sel !bg-[#4F46E5]/20 !border-[#6366F1]/50 !text-white" : "bg-white/5 border border-white/10 text-slate-300"}`}
                      onClick={() => setSussurroTo(member.id)}
                    >
                      {member.nickname}
                    </div>
                  ))}
                </div>
                <textarea
                  className="w-full rounded-lg bg-[#0B0F19] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-[#6366F1] focus:outline-none transition-all resize-none"
                  style={{
                    height: 70,
                  }}
                  placeholder={t("comm.placeholderIndividual")}
                  value={sussurroInput}
                  disabled={!board.event.switches.chat}
                  onChange={(e) => setSussurroInput(e.target.value)}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    className="text-slate-500"
                    style={{
                      fontSize: 10,
                      flex: 1,
                      fontStyle: "italic",
                    }}
                  >
                    {t("comm.soDestinatario")}
                  </div>
                  <button
                    className="btn btn-primary btn-sm bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                    onClick={() => void enviarSussurro()}
                    disabled={!sussurroTo || !board.event.switches.chat}
                  >
                    {t("comm.enviar")}
                  </button>
                </div>
              </div>
            )}

            {commTab === "registro" && (
              <div className="comm-content on">
                <div className="chat-body">
                  {historyMessages.length === 0 && (
                    <div className="text-slate-500" style={{ fontSize: 11 }}>
                      {t("comm.semMensagens")}
                    </div>
                  )}
                  {historyMessages.map((m) => {
                    const label =
                      m.type === "TEAM"
                        ? (m.from?.nickname ?? "")
                        : m.type === "PRIVATE"
                          ? t("comm2.paraDestino", {
                              nome: m.mine
                                ? (m.to?.nickname ?? "")
                                : (m.from?.nickname ?? ""),
                            })
                          : t("comm2.cutucou", {
                              nome: m.mine
                                ? (m.to?.nickname ?? "")
                                : (m.from?.nickname ?? ""),
                            });
                    return (
                      <div
                        key={m.id}
                        className={`chat-msg chat-${m.type === "TEAM" ? "balao" : m.type === "PRIVATE" ? "sussurro" : "cutucar"}`}
                      >
                        <div className="chat-bubble bg-[#0B0F19]/80 border border-white/5 rounded-lg">
                          <div className="chat-nm text-white">{label}</div>
                          {m.text && (
                            <div className="chat-txt text-slate-300">
                              {m.text}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  className="text-slate-500"
                  style={{
                    fontSize: 9,
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
              const key = board.keys[id];
              const keyInfo = tKeys.raw(id) as KeyTranslation;
              const colorVar = `var(${KEY_COLOR_VAR[id]})`;
              const concluida = key.status === "concluida";
              const ativa = key.status === "ativa";
              const bloqueada = key.status === "bloqueada";
              const badgeTxt = concluida
                ? t("chave.concluida")
                : ativa
                  ? t("chave.ativa")
                  : t("chave.pendente");
              const pct = Math.round(
                (Object.values(key.phases).filter(
                  (p) => p.status === "concluida",
                ).length /
                  TOTAL_FASES) *
                  100,
              );

              const hoverGlowClass =
                id === "problema"
                  ? "hover:shadow-[0_12px_32px_-10px_rgba(249,202,74,0.3)] hover:border-white/10"
                  : id === "solucao"
                    ? "hover:shadow-[0_12px_32px_-10px_rgba(183,255,90,0.32)] hover:border-white/10"
                    : id === "parcerias"
                      ? "hover:shadow-[0_12px_32px_-10px_rgba(79,70,229,0.35)] hover:border-white/10"
                      : "hover:shadow-[0_12px_32px_-10px_rgba(80,221,255,0.3)] hover:border-white/10";

              return (
                <div
                  key={id}
                  className={`chave-card bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:-translate-y-0.5 ${hoverGlowClass}`}
                  style={{
                    borderColor:
                      concluida || ativa
                        ? `var(${KEY_COLOR_VAR[id]}-bd)`
                        : undefined,
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
                          concluida || ativa
                            ? colorVar
                            : "rgba(255,255,255,.55)",
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
                      const phase = key.phases[String(numero)] ?? {
                        status: "bloqueada" as const,
                      };
                      const done = phase.status === "concluida";
                      const locked = phase.status === "bloqueada" || bloqueada;
                      const active = !done && !locked;
                      const nome = t(`fases.${id}.${numero - 1}.nome`);
                      return (
                        <div
                          key={numero}
                          className={`cc-fase bg-[#0B0F19]/75 border border-white/5 rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10 hover:translate-x-0.5 ${done ? "done" : ""} ${active ? "active" : ""} ${locked ? "locked" : ""}`}
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
                            className={`cc-fnm ${
                              done
                                ? "text-slate-300"
                                : active
                                  ? "text-white"
                                  : "text-slate-500"
                            }`}
                          >
                            {nome}
                          </div>
                          <div className="cc-ftxt text-slate-400">
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
                  <div className="cc-prog-bar bg-[#0B0F19]">
                    <div
                      className="cc-prog-fill"
                      style={{ width: `${pct}%`, background: colorVar }}
                    />
                  </div>
                  {bloqueada && (
                    <div
                      className="text-slate-500 bg-[#0B0F19]/60 border border-dashed border-white/10 rounded-lg"
                      style={{
                        marginTop: 8,
                        fontSize: 10,
                        textAlign: "center",
                        padding: 6,
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
          <h3 className="text-white">
            {t("fase.tituloModal", {
              numero: openPhase.numero,
              nome: openPhase.nome,
            })}
          </h3>
          <p className="text-slate-400">
            {t(`fases.${openPhase.keyId}.${openPhase.numero - 1}.pergunta`)}
          </p>
          <form onSubmit={concluirFase}>
            <div className="field">
              <label className="text-slate-400">{t("fase.label")}</label>
              <textarea
                className="w-full rounded-lg bg-[#0B0F19] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#6366F1] focus:outline-none transition-all"
                style={{ height: 100, resize: "vertical" }}
                placeholder={t("fase.placeholder")}
                value={phaseContent}
                onChange={(e) => setPhaseContent(e.target.value)}
                autoFocus
                maxLength={5000}
              />
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                className="btn btn-ghost bg-none bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg transition-all"
                onClick={() => setOpenPhase(null)}
                disabled={savingPhase}
              >
                {t("fase.cancelar")}
              </button>
              <button
                type="submit"
                className="btn btn-primary bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                disabled={savingPhase}
              >
                {t("fase.concluir")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {congrats && (
        <div id="overlay-congrats" className="bg-[#0B0F19]/80 backdrop-blur-md">
          <div className="congrats-box bg-[#151B2B]/90 backdrop-blur-xl border border-white/10 rounded-xl">
            <div className="congrats-stars">
              <span className="congrats-star">⭐</span>
              <span className="congrats-star">🌟</span>
              <span className="congrats-star">⭐</span>
            </div>
            <div className="congrats-title text-white">{congrats.titulo}</div>
            <div className="congrats-sub text-slate-400">{congrats.sub}</div>
            {congrats.pontos !== null && (
              <div className="congrats-pts-badge">
                +{congrats.pontos} {t("congrats.pontos")}
              </div>
            )}
            <button
              className="btn btn-primary bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
              style={{ width: "100%" }}
              onClick={() => setCongrats(null)}
            >
              {t("congrats.continuar")}
            </button>
          </div>
        </div>
      )}

      {showAvisos && (
        <Modal onClose={() => setShowAvisos(false)} maxWidth={440}>
          <h3 className="text-white">🔔 {t("avisos.titulo")}</h3>
          {board.announcements.length === 0 ? (
            <p className="text-slate-400" style={{ fontSize: 12 }}>
              {t("avisos.vazio")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {board.announcements.map((a) => (
                <div
                  key={a.id}
                  className="bg-[#0B0F19]/80 border border-white/5 rounded-xl text-slate-200 transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10"
                  style={{
                    padding: "9px 11px",
                    fontSize: 12,
                  }}
                >
                  {a.text}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {showEncerramento && (
        <div
          id="overlay-encerramento"
          className="bg-[#0B0F19]/80 backdrop-blur-md"
        >
          <div
            className="bg-[#151B2B]/90 backdrop-blur-xl border border-white/10 rounded-xl text-slate-200"
            style={{
              padding: "28px 28px 24px",
              maxWidth: 520,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
              <div
                className="text-white"
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: "-.5px",
                }}
              >
                {t("encerramento.titulo")}
              </div>
              <div
                className="text-slate-400"
                style={{ fontSize: 13, marginTop: 4 }}
              >
                {t("encerramento.subTpl", {
                  equipe: board.team.name,
                  pontos: board.team.score,
                })}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {KEY_IDS.map((id) => {
                const keyInfo = tKeys.raw(id) as KeyTranslation;
                const colorVar = `var(${KEY_COLOR_VAR[id]})`;
                const fasesComConteudo = [1, 2, 3]
                  .map((numero) => ({
                    numero,
                    conteudo: board.keys[id].phases[String(numero)]?.conteudo,
                    nome: t(`fases.${id}.${numero - 1}.nome`),
                  }))
                  .filter((f) => f.conteudo);
                return (
                  <div
                    key={id}
                    className="enc-chave-card bg-[#0B0F19]/80 border border-white/5 rounded-xl"
                  >
                    <div
                      className="enc-chave-titulo"
                      style={{
                        color: colorVar,
                        borderBottom: `1px solid var(${KEY_COLOR_VAR[id]}-bd)`,
                        paddingBottom: 8,
                      }}
                    >
                      {keyInfo.icon} {keyInfo.name}
                    </div>
                    {fasesComConteudo.length === 0 ? (
                      <div className="text-slate-500" style={{ fontSize: 11 }}>
                        {t("encerramento.semFases")}
                      </div>
                    ) : (
                      fasesComConteudo.map((f) => (
                        <div key={f.numero} className="enc-fase">
                          <div
                            className="enc-fase-nome"
                            style={{ color: colorVar }}
                          >
                            {f.nome}
                          </div>
                          <div className="enc-fase-conteudo text-slate-300">
                            {f.conteudo}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-ghost bg-none bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg transition-all"
                style={{ flex: 1 }}
                onClick={() => setShowEncerramento(false)}
              >
                {t("encerramento.revisar")}
              </button>
              <button
                className="btn btn-primary bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowEncerramento(false);
                  setShowSubmission(true);
                }}
              >
                {t("encerramento.entregar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRolePicker && (
        <RolePickerModal
          onClose={() => setShowRolePicker(false)}
          onSelect={selectRole}
        />
      )}

      {showSubmission && (
        <SubmissionModal
          onClose={() => setShowSubmission(false)}
          initialSubmission={board.submission}
          initialFiles={board.files}
          submissionsEnabled={board.event.switches.submissions}
          onChanged={() => void loadBoard()}
        />
      )}
    </div>
  );
}
