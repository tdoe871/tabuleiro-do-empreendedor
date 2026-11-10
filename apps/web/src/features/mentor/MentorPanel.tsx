"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { GemLogo } from "@/components/ui/GemLogo";
import { LangSwitcher } from "@/components/shared/LangSwitcher";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { sendJson, readApiError, translateApiError } from "@/lib/api/client";
import { KEY_IDS, KEY_COLOR_VAR, type KeyId } from "@/features/event/keys";

const CRITERIA = [
  "problema",
  "solucao",
  "impacto",
  "viabilidade",
  "apresentacao",
] as const;
type Criterion = (typeof CRITERIA)[number];

const POLL_MS = 15_000;

interface MentorFile {
  id: string;
  fileName: string;
  downloadUrl: string;
}

interface MentorTeam {
  id: string;
  name: string;
  memberCount: number;
  keys: Record<KeyId, "ativa" | "concluida" | "bloqueada">;
  submission: {
    type: string;
    url: string | null;
    description: string | null;
  } | null;
  files: MentorFile[];
  myEvaluation: {
    scores: Record<Criterion, number>;
    comment: string | null;
  } | null;
}

interface MentorData {
  event: { name: string; status: string };
  mentor: { name: string };
  teams: MentorTeam[];
  announcements: { id: string; text: string }[];
}

export function MentorPanel() {
  const t = useTranslations("mentor");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const router = useRouter();

  const [data, setData] = useState<MentorData | null>(null);
  const [evalTeam, setEvalTeam] = useState<MentorTeam | null>(null);
  const [scores, setScores] = useState<Record<Criterion, number>>({
    problema: 3,
    solucao: 3,
    impacto: 3,
    viabilidade: 3,
    apresentacao: 3,
  });
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/mentor", { cache: "no-store" });
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const body = (await res.json().catch(() => null)) as MentorData | null;
    if (res.ok && body) setData(body);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
    const interval = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  function openEvaluation(team: MentorTeam) {
    setEvalTeam(team);
    setScores(
      team.myEvaluation?.scores ?? {
        problema: 3,
        solucao: 3,
        impacto: 3,
        viabilidade: 3,
        apresentacao: 3,
      },
    );
    setComment(team.myEvaluation?.comment ?? "");
  }

  async function saveEvaluation() {
    if (!evalTeam) return;
    setSaving(true);
    try {
      const res = await sendJson(
        `/api/mentor/evaluations/${evalTeam.id}`,
        "PUT",
        { scores, comment: comment.trim() || undefined },
      );
      if (!res.ok) {
        const err = await readApiError(res);
        toast(
          "err",
          translateApiError(
            tCommon,
            err?.error,
            tCommon("errors.INTERNAL_ERROR"),
          ),
        );
        return;
      }
      toast("ok", t("avaliar.salvo"));
      setEvalTeam(null);
      void load();
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
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

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="topbar bg-neon-bg/80 backdrop-blur-xl border-b border-white/10">
        <div className="tb-logo">
          <div className="tb-gem backdrop-blur-md transition-all duration-300 hover:shadow-glow-amber">
            <GemLogo size={14} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {t("titulo")} · {data.mentor.name}
          </span>
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
            {data.event.name}
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

      {data.announcements.length > 0 && (
        <div
          style={{
            margin: "10px 20px 0",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {data.announcements.slice(0, 3).map((a) => (
            <div
              key={a.id}
              style={{
                background: "var(--sol-bg)",
                border: "1px solid var(--sol-bd)",
                borderRadius: 9,
                padding: "8px 12px",
                fontSize: 12,
              }}
            >
              📢 {a.text}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          padding: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {data.teams.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--t3)" }}>
            {t("semEquipes")}
          </div>
        )}
        {data.teams.map((team) => {
          const completed = KEY_IDS.filter(
            (id) => team.keys[id] === "concluida",
          ).length;
          return (
            <div
              key={team.id}
              className="card card-pad bg-white/5 backdrop-blur-md border border-white/10"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800 }}>{team.name}</div>
                <div style={{ fontSize: 11, color: "var(--t3)" }}>
                  👤 {team.memberCount}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, margin: "8px 0" }}>
                {KEY_IDS.map((id) => (
                  <div
                    key={id}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background:
                        team.keys[id] === "concluida"
                          ? `var(${KEY_COLOR_VAR[id]})`
                          : "rgba(255,255,255,.08)",
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)" }}>
                {completed}/4 {t("avaliar.chaves")}
              </div>
              {team.submission?.description && (
                <p style={{ fontSize: 11, color: "var(--t2)", marginTop: 6 }}>
                  {team.submission.description}
                </p>
              )}
              {team.files.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginTop: 6,
                  }}
                >
                  {team.files.map((f) => (
                    <a
                      key={f.id}
                      href={f.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, color: "var(--parc)" }}
                    >
                      📎 {f.fileName}
                    </a>
                  ))}
                </div>
              )}
              <button
                className="btn btn-primary btn-sm w100"
                style={{ marginTop: 10 }}
                onClick={() => openEvaluation(team)}
              >
                {team.myEvaluation
                  ? t("avaliar.editar")
                  : t("avaliar.calificar")}
              </button>
            </div>
          );
        })}
      </div>

      {evalTeam && (
        <Modal onClose={() => setEvalTeam(null)} maxWidth={480}>
          <h3>{evalTeam.name}</h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 10,
            }}
          >
            {CRITERIA.map((criterion) => (
              <div key={criterion} className="field">
                <label>
                  {t(`criterios.${criterion}`)}: {scores[criterion]}
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={scores[criterion]}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [criterion]: Number(e.target.value),
                    }))
                  }
                />
              </div>
            ))}
            <div className="field">
              <label>{t("avaliar.comentario")}</label>
              <textarea
                style={{ height: 70, resize: "vertical" }}
                value={comment}
                maxLength={2000}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 14,
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={() => setEvalTeam(null)}
              disabled={saving}
            >
              {t("avaliar.cancelar")}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => void saveEvaluation()}
              disabled={saving}
            >
              {t("avaliar.salvar")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
