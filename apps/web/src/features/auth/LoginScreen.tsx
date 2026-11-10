"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { GemLogo, StarWatermark } from "@/components/ui/GemLogo";
import { LangSwitcher } from "@/components/shared/LangSwitcher";
import { Modal } from "@/components/ui/Modal";
import { HeroConceitos } from "./HeroConceitos";
import {
  KEY_IDS,
  KEY_COLOR_VAR,
  type KeyTranslation,
} from "@/features/event/keys";
import { useToast } from "@/components/providers/ToastProvider";

type LoginTab = "login" | "cadastro" | "codigo" | "mentor";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res;
}

export function LoginScreen() {
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
  const tKeys = useTranslations("keys");
  const toast = useToast();
  const router = useRouter();
  const locale = useLocale();
  const [tab, setTab] = useState<LoginTab>("login");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  const [cadNome, setCadNome] = useState("");
  const [cadSobrenome, setCadSobrenome] = useState("");
  const [cadEmail, setCadEmail] = useState("");
  const [cadSenha, setCadSenha] = useState("");
  const [cadConf, setCadConf] = useState("");

  const [jogNome, setJogNome] = useState("");
  const [jogCodigo, setJogCodigo] = useState("");

  const [mentNome, setMentNome] = useState("");
  const [mentCodigo, setMentCodigo] = useState("");

  function authErrorMessage(code: string | undefined, fallback: string) {
    return code && tCommon.has(`errors.${code}`)
      ? tCommon(`errors.${code}`)
      : fallback;
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const res = await postJson("/api/auth/login", {
      email: loginEmail,
      senha: loginSenha,
    });
    if (res.ok) {
      router.push("/mestre/dashboard");
      return;
    }
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    toast("err", authErrorMessage(body?.error, t("toasts.invalidCredentials")));
  }

  async function handleCadastro(e: FormEvent) {
    e.preventDefault();
    if (cadSenha !== cadConf) {
      toast("err", t("toasts.passwordMismatch"));
      return;
    }
    const res = await postJson("/api/auth/register", {
      nome: cadNome,
      sobrenome: cadSobrenome,
      email: cadEmail,
      senha: cadSenha,
    });
    if (res.ok) {
      router.push("/mestre/dashboard");
      return;
    }
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    toast("err", authErrorMessage(body?.error, t("toasts.registerError")));
  }

  function handleCodigo(e: FormEvent) {
    e.preventDefault();
    if (!jogNome.trim() || !jogCodigo.trim()) {
      toast("err", t("toasts.missingFields"));
      return;
    }
    const params = new URLSearchParams({
      code: jogCodigo.trim().toUpperCase(),
      nickname: jogNome.trim(),
    });
    router.push(`/team?${params.toString()}`);
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    await postJson("/api/auth/password/forgot", {
      email: forgotEmail,
      locale,
    });
    // 202 always, whether or not the account exists — never reveal which.
    setForgotSent(true);
  }

  async function handleMentor(e: FormEvent) {
    e.preventDefault();
    const res = await postJson("/api/mentors", {
      mentorCode: mentCodigo.trim(),
      name: mentNome.trim(),
    });
    if (res.ok) {
      router.push("/mentor/dashboard");
      return;
    }
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    toast("err", authErrorMessage(body?.error, t("toasts.mentorError")));
  }

  const footerLines = t("footer").split("\n");

  return (
    <>
      <div id="tela-login" className="bg-[#0B0F19] text-slate-200">
        <div className="login-hero bg-[#0B0F19] text-slate-200 border-r border-white/5">
          <div className="glow-prob" />
          <div className="glow-parc" />
          <div className="glow-opor" />
          <div className="hero-star">
            <StarWatermark />
          </div>
          <div className="login-hero-content anim-in text-slate-200">
            <div className="logo-row">
              <div className="logo-gem bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10">
                <GemLogo />
              </div>
              <div>
                <div className="logo-nm text-white">{tCommon("appName")}</div>
                <div className="logo-sb text-slate-400">TdoE</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <LangSwitcher />
              </div>
            </div>
            <div>
              <div className="hero-hl text-white">{t("heroHl")}</div>
              <div className="hero-jogo grad">{t("heroJogo")}</div>
              <div className="hero-tag text-slate-400">{t("heroTag")}</div>
              <div className="hero-chips">
                {KEY_IDS.map((id) => {
                  const key = tKeys.raw(id) as KeyTranslation;
                  return (
                    <div
                      key={id}
                      className="badge bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10"
                      style={{
                        background: `var(${KEY_COLOR_VAR[id]}-bg)`,
                        color: `var(${KEY_COLOR_VAR[id]})`,
                        borderColor: `var(${KEY_COLOR_VAR[id]}-bd)`,
                      }}
                    >
                      {key.icon} {key.name}
                    </div>
                  );
                })}
              </div>
              <HeroConceitos />
            </div>
          </div>
          <div className="hero-foot text-slate-500">© 2026 TdoE</div>
          <div className="hero-bar" />
        </div>

        <div className="login-panel bg-[#151B2B]/90 backdrop-blur-xl border-l border-white/5 text-slate-200">
          <div className="login-tabs bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-xl">
            <div
              className={`login-tab text-slate-400 transition-all duration-300 hover:bg-white/5 hover:text-white ${tab === "login" ? "on bg-[#4F46E5] text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" : ""}`}
              onClick={() => setTab("login")}
            >
              {t("tabs.login")}
            </div>
            <div
              className={`login-tab text-slate-400 transition-all duration-300 hover:bg-white/5 hover:text-white ${tab === "cadastro" ? "on bg-[#4F46E5] text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" : ""}`}
              onClick={() => setTab("cadastro")}
            >
              {t("tabs.cadastro")}
            </div>
            <div
              className={`login-tab text-slate-400 transition-all duration-300 hover:bg-white/5 hover:text-white ${tab === "codigo" ? "on bg-[#4F46E5] text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" : ""}`}
              onClick={() => setTab("codigo")}
            >
              {t("tabs.codigo")}
            </div>
            <div
              className={`login-tab text-slate-400 transition-all duration-300 hover:bg-white/5 hover:text-white ${tab === "mentor" ? "on bg-[#4F46E5] text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" : ""}`}
              onClick={() => setTab("mentor")}
            >
              {t("tabs.mentor")}
            </div>
          </div>

          {tab === "login" && (
            <form className="anim-in text-slate-200" onSubmit={handleLogin}>
              <div className="login-title text-white">{t("form.titleEdu")}</div>
              <div className="login-sub text-slate-400">{t("form.subEdu")}</div>
              <div className="field">
                <label>{t("form.email")}</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>{t("form.senha")}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  required
                />
              </div>
              <div style={{ textAlign: "right", marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(loginEmail);
                    setForgotSent(false);
                    setShowForgot(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--t3)",
                    fontSize: 11,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {t("form.esqueceuSenha")}
                </button>
              </div>
              <button
                type="submit"
                className="btn btn-primary w100 bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                {t("form.enter")}
              </button>
            </form>
          )}

          {tab === "cadastro" && (
            <form className="anim-in text-slate-200" onSubmit={handleCadastro}>
              <div className="login-title text-white">{t("form.titleCad")}</div>
              <div className="login-sub text-slate-400">{t("form.subCad")}</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div className="field">
                  <label>{t("form.nome")}</label>
                  <input
                    value={cadNome}
                    onChange={(e) => setCadNome(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>{t("form.sobrenome")}</label>
                  <input
                    value={cadSobrenome}
                    onChange={(e) => setCadSobrenome(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label>{t("form.email")}</label>
                <input
                  type="email"
                  value={cadEmail}
                  onChange={(e) => setCadEmail(e.target.value)}
                  required
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div className="field">
                  <label>{t("form.senha")}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={cadSenha}
                    onChange={(e) => setCadSenha(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="field">
                  <label>{t("form.confirmar")}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={cadConf}
                    onChange={(e) => setCadConf(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary w100 bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                {t("form.criarConta")}
              </button>
            </form>
          )}

          {tab === "codigo" && (
            <form className="anim-in text-slate-200" onSubmit={handleCodigo}>
              <div className="login-title text-white">{t("form.titleCod")}</div>
              <div className="login-sub text-slate-400">{t("form.subCod")}</div>
              <div className="field">
                <label>{t("form.seuNome")}</label>
                <input
                  placeholder={t("form.comoChamado")}
                  value={jogNome}
                  onChange={(e) => setJogNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>{t("form.codigoSessao")}</label>
                <input
                  placeholder={t("form.codigoPlaceholder")}
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: ".2em",
                    fontWeight: 700,
                  }}
                  value={jogCodigo}
                  onChange={(e) => setJogCodigo(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w100 bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                {t("form.entrarJogo")}
              </button>
              <div style={{ marginTop: 12 }}>
                <div className="code-blk bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10">
                  <div className="code-gem bg-white/5 border border-white/10 rounded-lg">
                    <GemLogo size={20} />
                  </div>
                  <div>
                    <div
                      className="small muted text-white"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--t2)",
                      }}
                    >
                      {t("form.codeHint1")}
                    </div>
                    <div
                      className="small muted text-slate-400"
                      style={{ marginTop: 2 }}
                    >
                      {t("form.codeHint2")}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}

          {tab === "mentor" && (
            <form className="anim-in text-slate-200" onSubmit={handleMentor}>
              <div className="login-title text-white">
                {t("form.titleMentor")}
              </div>
              <div className="login-sub text-slate-400">
                {t("form.subMentor")}
              </div>
              <div className="field">
                <label>{t("form.seuNome")}</label>
                <input
                  placeholder={t("form.comoChamado")}
                  value={mentNome}
                  onChange={(e) => setMentNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>{t("form.codigoMentores")}</label>
                <input
                  placeholder={t("form.codigoPlaceholder")}
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: ".2em",
                    fontWeight: 700,
                  }}
                  value={mentCodigo}
                  onChange={(e) => setMentCodigo(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w100 bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                {t("form.entrarMentor")}
              </button>
            </form>
          )}
        </div>
      </div>
      <div
        style={{
          textAlign: "center",
          padding: "18px 20px 24px",
          fontSize: 11,
          color: "var(--t3)",
          lineHeight: 1.6,
        }}
      >
        {footerLines.map((line, i) => (
          <span key={i}>
            {line}
            {i < footerLines.length - 1 && <br />}
          </span>
        ))}
      </div>

      {showForgot && (
        <Modal onClose={() => setShowForgot(false)} maxWidth={400}>
          <h3>{t("forgot.titulo")}</h3>
          {forgotSent ? (
            <p style={{ fontSize: 12, color: "var(--t2)" }}>
              {t("forgot.enviado")}
            </p>
          ) : (
            <form onSubmit={handleForgot}>
              <p style={{ fontSize: 12, color: "var(--t3)" }}>
                {t("forgot.sub")}
              </p>
              <div className="field">
                <label>{t("form.email")}</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w100 bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                {t("forgot.enviar")}
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
