"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/providers/ToastProvider";

export default function JoinTeamPage() {
  const t = useTranslations("team");
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const nickname = params.get("nickname") ?? "";
  const [joinCode, setJoinCode] = useState(params.get("code") ?? "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamJoinCode: joinCode, nickname }),
    });
    if (res.status === 501) {
      toast(
        "info",
        "Unirse a equipo: backend en construcción — abriendo tablero en modo preview.",
      );
      router.push(
        `/jogador/dashboard?nickname=${encodeURIComponent(nickname)}`,
      );
      return;
    }
    if (res.ok) {
      router.push(
        `/jogador/dashboard?nickname=${encodeURIComponent(nickname)}`,
      );
      return;
    }
    toast("err", "Código de equipo inválido");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        className="card card-pad"
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
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary w100">
          {t("joinTeam")}
        </button>
      </form>
    </div>
  );
}
