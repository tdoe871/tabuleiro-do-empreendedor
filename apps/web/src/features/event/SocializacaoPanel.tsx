"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import {
  KEY_IDS,
  KEY_COLOR_VAR,
  type KeyTranslation,
} from "@/features/event/keys";

type SimKeyStatus = "concluida" | "disponivel" | "pendente";

interface SimTeam {
  nome: string;
  chaves: Record<string, SimKeyStatus>;
  proposta: string | null;
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#00F5D4,#00A896)",
  "linear-gradient(135deg,#00BBF9,#0284C7)",
  "linear-gradient(135deg,#2DD4BF,#0D9488)",
  "linear-gradient(135deg,#38BDF8,#0369A1)",
  "linear-gradient(135deg,#FBBF24,#D97706)",
];

function buildSimTeams(count: number): SimTeam[] {
  return Array.from({ length: count }, (_, i) => {
    const advancement = Math.max(0, 4 - i); // first teams more advanced, demo only
    const chaves: Record<string, SimKeyStatus> = {};
    KEY_IDS.forEach((id, idx) => {
      chaves[id] =
        idx < advancement
          ? "concluida"
          : idx === advancement
            ? "disponivel"
            : "pendente";
    });
    return {
      nome: `Equipe ${i + 1}`,
      chaves,
      proposta:
        advancement >= 2
          ? "Proposta de intervenção em construção pela equipe..."
          : null,
    };
  });
}

export function SocializacaoPanel({
  numEquipes = 5,
  contexto = "Bairro Novo Horizonte",
}: {
  numEquipes?: number;
  contexto?: string;
}) {
  const t = useTranslations("socializacao");
  const tKeys = useTranslations("keys");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const router = useRouter();

  const teams = useMemo(() => buildSimTeams(numEquipes), [numEquipes]);
  const totalChaves = teams.reduce(
    (acc, team) =>
      acc + Object.values(team.chaves).filter((s) => s === "concluida").length,
    0,
  );

  return (
    <div
      id="tela-socializacao"
      className="min-h-screen bg-[var(--ag-color-background,#04151f)] text-[var(--ag-color-text,#ecfeff)]"
    >
      <div className="topbar bg-[var(--ag-color-sidebar,rgba(6,26,38,0.90))] backdrop-blur-2xl border-b border-[var(--ag-color-border,rgba(45,212,191,0.24))]">
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
        <div style={{ fontSize: 10, color: "var(--t3)", fontStyle: "italic" }}>
          ⚠ {t("avisoDemo")}
        </div>

        <div className="soc-summary">
          <div className="sum-card bg-[var(--ag-color-surface,rgba(10,38,54,0.78))] backdrop-blur-2xl border border-[var(--ag-color-border,rgba(45,212,191,0.24))] rounded-[20px] transition-all duration-300 hover:-translate-y-1 hover:border-[#2DD4BF]/50 hover:shadow-[0_12px_32px_-8px_rgba(45,212,191,0.28)]">
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
          <div className="sum-card bg-[var(--ag-color-surface,rgba(10,38,54,0.78))] backdrop-blur-2xl border border-[var(--ag-color-border,rgba(45,212,191,0.24))] rounded-[20px] transition-all duration-300 hover:-translate-y-1 hover:border-[#00F5D4]/50 hover:shadow-[0_12px_32px_-8px_rgba(0,245,212,0.28)]">
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
          <div className="sum-card bg-[var(--ag-color-surface,rgba(10,38,54,0.78))] backdrop-blur-2xl border border-[var(--ag-color-border,rgba(45,212,191,0.24))] rounded-[20px] transition-all duration-300 hover:-translate-y-1 hover:border-[#38BDF8]/50 hover:shadow-[0_12px_32px_-8px_rgba(56,189,248,0.28)]">
            <div className="sum-icon" style={{ background: "var(--parc-bg)" }}>
              📋
            </div>
            <div>
              <div
                className="sum-val"
                style={{ color: "var(--parc)", fontSize: 14 }}
              >
                {contexto}
              </div>
              <div className="sum-lbl">{t("resumo.contexto")}</div>
            </div>
          </div>
          <div className="sum-card bg-[var(--ag-color-surface,rgba(10,38,54,0.78))] backdrop-blur-2xl border border-[var(--ag-color-border,rgba(45,212,191,0.24))] rounded-[20px] transition-all duration-300 hover:-translate-y-1 hover:border-[#FBBF24]/50 hover:shadow-[0_12px_32px_-8px_rgba(251,191,36,0.28)]">
            <div className="sum-icon" style={{ background: "var(--gold-bg)" }}>
              ★
            </div>
            <div>
              <div
                className="sum-val"
                style={{ color: "var(--gold)", fontSize: 14 }}
              >
                {teams[0]?.nome ?? "—"}
              </div>
              <div className="sum-lbl">{t("resumo.maisAvancadaLbl")}</div>
            </div>
          </div>
        </div>

        <div className="pitch-grid">
          {teams.map((team, i) => {
            const probStatus = team.chaves.problema;
            return (
              <div
                className="pitch-card bg-[var(--ag-color-surface,rgba(10,38,54,0.78))] backdrop-blur-2xl border border-[var(--ag-color-border,rgba(45,212,191,0.24))] rounded-[20px] transition-all duration-300 hover:-translate-y-1 hover:border-[#00F5D4]/50 hover:shadow-[0_14px_34px_-8px_rgba(0,245,212,0.3)]"
                key={team.nome}
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
                    <div className="pc-eq-nm">{team.nome}</div>
                    <div className="pc-ctx">{contexto}</div>
                  </div>
                  {i === 0 && (
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
                    const status = team.chaves[id];
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
                          {done ? "✓" : status === "disponivel" ? "○" : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {team.proposta ? (
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
                      {team.proposta}
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
                          team.chaves[id] === "concluida"
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
          <button
            className="btn btn-primary btn-sm"
            onClick={() =>
              toast(
                "info",
                tCommon("toasts.featurePendente", {
                  feature: t("encerrarSessao"),
                }),
              )
            }
          >
            {t("encerrarSessao")}
          </button>
        </div>
      </div>
    </div>
  );
}
