"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { GemLogo } from "@/components/ui/GemLogo";
import { useToast } from "@/components/providers/ToastProvider";
import { sendJson, readApiError, translateApiError } from "@/lib/api/client";

type CheckState = "checking" | "valid" | "invalid";

export function ResetPasswordScreen() {
  const t = useTranslations("resetPassword");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<CheckState>("checking");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function check() {
      const hash = window.location.hash.replace(/^#/, "");
      const value = new URLSearchParams(hash).get("token");
      if (!value) {
        setState("invalid");
        return;
      }
      setToken(value);
      const res = await sendJson("/api/auth/password/check", "POST", {
        token: value,
      });
      setState(res.ok ? "valid" : "invalid");
    }
    void check();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (senha !== confirmar) {
      toast("err", t("senhasDiferentes"));
      return;
    }
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await sendJson("/api/auth/password/reset", "POST", {
        token,
        senha,
      });
      if (!res.ok) {
        const err = await readApiError(res);
        toast("err", translateApiError(tCommon, err?.error, t("erro")));
        return;
      }
      toast("ok", t("sucesso"));
      router.push("/mestre/dashboard");
    } finally {
      setSubmitting(false);
    }
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
      <div
        className="card card-pad anim-in bg-white/5 backdrop-blur-md border border-white/10"
        style={{ maxWidth: 420, width: "100%" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <GemLogo size={20} />
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>{t("titulo")}</h2>
        </div>

        {state === "checking" && (
          <p style={{ fontSize: 12, color: "var(--t3)" }}>{t("verificando")}</p>
        )}

        {state === "invalid" && (
          <>
            <p style={{ fontSize: 12, color: "var(--t2)" }}>
              {t("linkInvalido")}
            </p>
            <button
              className="btn btn-ghost w100"
              style={{ marginTop: 10 }}
              onClick={() => router.push("/")}
            >
              {t("voltarLogin")}
            </button>
          </>
        )}

        {state === "valid" && (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: 12, color: "var(--t3)", marginBottom: 10 }}>
              {t("sub")}
            </p>
            <div className="field">
              <label>{t("novaSenha")}</label>
              <input
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={8}
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label>{t("confirmarSenha")}</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w100"
              disabled={submitting}
            >
              {t("salvar")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
