"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useRealtime } from "@/lib/realtime/useRealtime";
import {
  KEY_IDS,
  KEY_COLOR_VAR,
  type KeyId,
  type KeyTranslation,
} from "@/features/event/keys";

type OverviewKeyStatus = "ativa" | "concluida" | "bloqueada";

interface OverviewTeam {
  id: string;
  name: string;
  keys: Record<KeyId, OverviewKeyStatus>;
  submission: { description: string | null } | null;
}

interface Overview {
  event: { scenario: string | null; name: string };
  teams: OverviewTeam[];
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#1A9055,#0F5E38)",
  "linear-gradient(135deg,#1A4E9E,#0F3370)",
  "linear-gradient(135deg,#6A28A0,#441870)",
  "linear-gradient(135deg,#E8A830,#C4891A)",
  "linear-gradient(135deg,#0A8C7A,#065C50)",
];

export function SocializacaoPanel({ eventId }: { eventId: string }) {
  const t = useTranslations("socializacao");
  const tKeys = useTranslations("keys");
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/events/${eventId}/overview`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const body = (await res.json().catch(() => null)) as Overview | null;
      if (!cancelled && res.ok && body) setOverview(body);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId, router]);

  useRealtime(
    () => {
      if (!eventId) return;
      fetch(`/api/events/${eventId}/overview`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((body: Overview | null) => {
          if (body) setOverview(body);
        })
        .catch(() => {});
    },
    { eventId: eventId || undefined },
  );

  const teams = overview?.teams ?? [];
  const contexto = overview?.event.scenario ?? overview?.event.name ?? "";
  const totalChaves = teams.reduce(
    (acc, team) =>
      acc + KEY_IDS.filter((id) => team.keys[id] === "concluida").length,
    0,
  );
  const mostAdvanced = [...teams].sort(
    (a, b) =>
      KEY_IDS.filter((id) => b.keys[id] === "concluida").length -
      KEY_IDS.filter((id) => a.keys[id] === "concluida").length,
  )[0];

  return (
    <div id="tela-socializacao">
      <div className="topbar bg-neon-bg/80 backdrop-blur-xl border-b border-white/10">
        <div className="tb-logo">
          <span style={{ fontSize: 16, fontWeight: 800 }}>{t("titulo")}</span>
        </div>
        <div className="tb-sep" />
        <div className="tb-right" style={{ marginLeft: "auto" }}>
          <div
            className="badge"
            style={{
              background: "var(--prob-bg)",
              color: "var(--prob)",
              borderColor: "var(--prob-bd)",
            }}
          >
            ⬤ {t("aoVivo")}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/mestre/dashboard")}
          >
            {t("voltar")}
          </button>
        </div>
      </div>
      <div className="quad-bar" />
      <div className="soc-body">
        <div className="soc-summary">
          <div className="sum-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-lime/40 hover:shadow-glow-lime">
            <div className="sum-icon" style={{ background: "var(--prob-bg)" }}>
              👥
            </div>
            <div>
              <div className="sum-val" style={{ color: "var(--prob)" }}>
                {teams.length}
              </div>
              <div className="sum-lbl">{t("resumo.equipes")}</div>
            </div>
          </div>
          <div className="sum-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-cyan/40 hover:shadow-glow-cyan">
            <div className="sum-icon" style={{ background: "var(--sol-bg)" }}>
              ✓
            </div>
            <div>
              <div className="sum-val" style={{ color: "var(--sol)" }}>
                {totalChaves}
              </div>
              <div className="sum-lbl">{t("resumo.chavesConcluidas")}</div>
            </div>
          </div>
          <div className="sum-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-purple/40 hover:shadow-glow-purple">
            <div className="sum-icon" style={{ background: "var(--parc-bg)" }}>
              📋
            </div>
            <div>
              <div
                className="sum-val"
                style={{ color: "var(--parc)", fontSize: 14 }}
              >
                {contexto || "—"}
              </div>
              <div className="sum-lbl">{t("resumo.contexto")}</div>
            </div>
          </div>
          <div className="sum-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-amber/40 hover:shadow-glow-amber">
            <div className="sum-icon" style={{ background: "var(--gold-bg)" }}>
              ★
            </div>
            <div>
              <div
                className="sum-val"
                style={{ color: "var(--gold)", fontSize: 14 }}
              >
                {mostAdvanced?.name ?? "—"}
              </div>
              <div className="sum-lbl">{t("resumo.maisAvancadaLbl")}</div>
            </div>
          </div>
        </div>

        <div className="pitch-grid">
          {teams.map((team, i) => {
            const probStatus = team.keys.problema;
            return (
              <div
                className="pitch-card bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-neon-purple/40 hover:shadow-glow-purple"
                key={team.id}
              >
                <div className="pitch-card-top">
                  <div
                    className="pc-eq-av"
                    style={{
                      background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
                    }}
                  >
                    E{i + 1}
                  </div>
                  <div>
                    <div className="pc-eq-nm">{team.name}</div>
                    <div className="pc-ctx">{contexto}</div>
                  </div>
                  {team.id === mostAdvanced?.id && (
                    <div
                      style={{
                        fontSize: 9,
                        color: "var(--parc)",
                        fontWeight: 700,
                        marginLeft: "auto",
                      }}
                    >
                      {t("maisAvancada")}
                    </div>
                  )}
                </div>
                <div className="pc-prob">
                  <div className="pc-prob-lbl" style={{ color: "var(--prob)" }}>
                    🔍 {(tKeys.raw("problema") as KeyTranslation).name}
                  </div>
                  <div className="pc-prob-txt">
                    {probStatus === "concluida"
                      ? t("investigada")
                      : t("emInvestigacao")}
                  </div>
                </div>
                <div className="pc-chaves">
                  {KEY_IDS.map((id) => {
                    const status = team.keys[id];
                    const done = status === "concluida";
                    const keyInfo = tKeys.raw(id) as KeyTranslation;
                    return (
                      <div
                        key={id}
                        className="pc-chave"
                        style={{
                          background: done
                            ? `var(${KEY_COLOR_VAR[id]}-bg)`
                            : "rgba(255,255,255,.04)",
                          borderColor: done
                            ? `var(${KEY_COLOR_VAR[id]}-bd)`
                            : "rgba(255,255,255,.08)",
                        }}
                      >
                        <span style={{ fontSize: 11 }}>{keyInfo.icon}</span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: done
                              ? `var(${KEY_COLOR_VAR[id]})`
                              : "var(--t3)",
                          }}
                        >
                          {keyInfo.name.slice(0, 4)}
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 9,
                            color: done
                              ? `var(${KEY_COLOR_VAR[id]})`
                              : "var(--t3)",
                          }}
                        >
                          {done ? "✓" : status === "ativa" ? "○" : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {team.submission?.description ? (
                  <div
                    className="pc-prop"
                    style={{
                      background: "var(--prob-bg)",
                      border: ".5px solid var(--prob-bd)",
                    }}
                  >
                    <div className="pc-prop-lbl">{t("proposta")}</div>
                    <div
                      className="pc-prop-txt"
                      style={{ color: "var(--prob)" }}
                    >
                      {team.submission.description}
                    </div>
                  </div>
                ) : (
                  <div
                    className="pc-prop"
                    style={{
                      background: "rgba(255,255,255,.03)",
                      border: ".5px solid var(--border)",
                    }}
                  >
                    <div
                      className="pc-prop-txt muted small"
                      style={{ fontStyle: "italic" }}
                    >
                      {t("emConstrucao")}
                    </div>
                  </div>
                )}
                <div className="pc-prog-bar">
                  {KEY_IDS.map((id) => (
                    <div
                      key={id}
                      className="pc-prog-seg"
                      style={{
                        background:
                          team.keys[id] === "concluida"
                            ? `var(${KEY_COLOR_VAR[id]})`
                            : "rgba(255,255,255,.07)",
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 4,
          }}
        >
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/mestre/dashboard")}
          >
            {t("voltarPainel")}
          </button>
        </div>
      </div>
    </div>
  );
}
