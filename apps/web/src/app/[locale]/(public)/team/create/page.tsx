"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { TeamFlowHeader } from "@/components/shared/TeamFlowHeader";

export default function CreateTeamPage() {
  const t = useTranslations("team");
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const eventCode = params.get("code") ?? "";
  const nickname = params.get("nickname") ?? "";

  const [name, setName] = useState("");
  const [created, setCreated] = useState<{
    name: string;
    joinCode: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventCode, name, nickname }),
    });
    if (res.status === 501) {
      toast("info", t("toasts.backendPendingCreate"));
      setCreated({
        name,
        joinCode:
          eventCode.slice(0, 3) +
          "-" +
          Math.random().toString(36).slice(2, 5).toUpperCase(),
      });
      return;
    }
    toast(
      res.ok ? "ok" : "err",
      res.ok ? t("toasts.created") : t("toasts.createError"),
    );
  }

  if (created) {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/team/join?code=${created.joinCode}`
        : "";
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
          <div
            className="card card-pad anim-in bg-white/5 backdrop-blur-md border border-white/10"
            style={{ maxWidth: 420, width: "100%" }}
          >
            <div
              className="badge"
              style={{
                background: "var(--prob-bg)",
                color: "var(--prob)",
                borderColor: "var(--prob-bd)",
              }}
            >
              {t("youAreLeader")}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>
              {created.name}
            </h2>
            <p style={{ fontSize: 12, color: "var(--t3)", marginTop: 8 }}>
              {t("shareLink")}
            </p>
            <div className="field" style={{ marginTop: 10 }}>
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary w100"
              style={{ marginTop: 14 }}
              onClick={() =>
                router.push(
                  `/jogador/dashboard?nickname=${encodeURIComponent(nickname)}`,
                )
              }
            >
              {t("enterBoardPreview")}
            </button>
          </div>
        </div>
      </div>
    );
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
            <label>{t("createNameLabel")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary w100">
            {t("createTeam")}
          </button>
        </form>
      </div>
    </div>
  );
}
