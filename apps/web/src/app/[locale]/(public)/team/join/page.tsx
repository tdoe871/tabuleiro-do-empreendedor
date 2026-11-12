"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { TeamFlowHeader } from "@/components/shared/TeamFlowHeader";
import { sendJson, readApiError, translateApiError } from "@/lib/api/client";

export default function JoinTeamPage() {
  const t = useTranslations("team");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const nicknameFromLink = params.get("nickname") ?? "";
  const [joinCode, setJoinCode] = useState(params.get("code") ?? "");
  const [nickname, setNickname] = useState(nicknameFromLink);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await sendJson("/api/participants", "POST", {
        teamJoinCode: joinCode,
        nickname,
      });
      if (!res.ok) {
        const err = await readApiError(res);
        toast(
          "err",
          translateApiError(tCommon, err?.error, t("toasts.invalidCode")),
        );
        return;
      }
      // Same nickname as someone already on the team: the API logs into
      // that participant. Say so, in case it is someone else with that name.
      const joined = (await res.json().catch(() => null)) as {
        participant?: { nickname?: string };
        recovered?: boolean;
      } | null;
      if (joined?.recovered) {
        toast(
          "err",
          t("toasts.recovered", {
            nickname: joined.participant?.nickname ?? nickname.trim(),
          }),
        );
      }
      router.push("/jogador/dashboard");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
      }}
    >
      <TeamFlowHeader />
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <form
          className="card card-pad anim-in bg-white/5 backdrop-blur-md border border-white/10"
          style={{ maxWidth: 420, width: "100%" }}
          onSubmit={handleSubmit}
        >
          <div className="field">
            <label>{t("joinCodeLabel")}</label>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={{
                textTransform: "uppercase",
                letterSpacing: ".15em",
                fontWeight: 700,
              }}
              required
              autoFocus={!nicknameFromLink}
            />
          </div>
          {!nicknameFromLink && (
            <div className="field">
              <label>{t("joinNicknameLabel")}</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary w100"
            disabled={submitting}
          >
            {t("joinTeam")}
          </button>
        </form>
      </div>
    </div>
  );
}
