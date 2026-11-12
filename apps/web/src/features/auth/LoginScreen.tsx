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
      <div id="tela-login" className="bg-slate-50 text-slate-900">
        <div className="login-hero bg-none bg-[#1E1B4B] text-slate-200 border-r border-indigo-950">
          <div className="glow-prob opacity-30" />
          <div className="glow-parc opacity-30" />
          <div className="glow-opor opacity-30" />
          <div className="hero-star opacity-5">
            <StarWatermark />
          </div>
          <div className="login-hero-content anim-in">
            <div className="logo-row">
              <div className="logo-gem bg-indigo-900/80 border border-indigo-400/30 shadow-sm transition-all duration-300">
                <GemLogo />
              </div>
              <div>
                <div className="logo-nm text-white">{tCommon("appName")}</div>
                <div className="logo-sb text-indigo-200/70">TdoE</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <LangSwitcher />
              </div>
            </div>
            <div>
              <div className="hero-hl text-white">{t("heroHl")}</div>
              <div className="hero-jogo grad">{t("heroJogo")}</div>
              <div className="hero-tag text-indigo-200/70">{t("heroTag")}</div>
              <div className="hero-chips">
                {KEY_IDS.map((id) => {
                  const key = tKeys.raw(id) as KeyTranslation;
                  return (
                    <div
                      key={id}
                      className="badge transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
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
          <div className="hero-foot text-indigo-200/60">© 2026 TdoE</div>
          <div className="hero-bar bg-none bg-[#6366F1]" />
        </div>

        <div className="login-panel bg-none bg-slate-50 text-slate-900 border-l border-slate-200 before:hidden">
          <div className="login-tabs bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
            <div
              className={`login-tab rounded-lg transition-all duration-200 ${
                tab === "login"
                  ? "on !bg-[#6366F1] !text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
              onClick={() => setTab("login")}
            >
              {t("tabs.login")}
            </div>
            <div
              className={`login-tab rounded-lg transition-all duration-200 ${
                tab === "cadastro"
                  ? "on !bg-[#6366F1] !text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
              onClick={() => setTab("cadastro")}
            >
              {t("tabs.cadastro")}
            </div>
            <div
              className={`login-tab rounded-lg transition-all duration-200 ${
                tab === "codigo"
                  ? "on !bg-[#6366F1] !text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
              onClick={() => setTab("codigo")}
            >
              {t("tabs.codigo")}
            </div>
            <div
              className={`login-tab rounded-lg transition-all duration-200 ${
                tab === "mentor"
                  ? "on !bg-[#6366F1] !text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
              onClick={() => setTab("mentor")}
            >
              {t("tabs.mentor")}
            </div>
          </div>

          {tab === "login" && (
            <form
              className="anim-in bg-white border border-slate-200 rounded-xl shadow-sm p-7 transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5"
              onSubmit={handleLogin}
            >
              <div className="login-title text-slate-900">
                {t("form.titleEdu")}
              </div>
              <div className="login-sub text-slate-500">{t("form.subEdu")}</div>
              <div className="field">
                <label className="text-slate-500">{t("form.email")}</label>
                <input
                  type="email"
                  className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="text-slate-500">{t("form.senha")}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  required
                />
              </div>
              <div style={{ textAlign: "right", marginBottom: 10 }}>
                <button
                  type="button"
                  className="text-slate-500 hover:text-[#6366F1] font-medium transition-colors"
                  onClick={() => {
                    setForgotEmail(loginEmail);
                    setForgotSent(false);
                    setShowForgot(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
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
                className="btn btn-primary w100 bg-none bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-lg shadow-sm active:scale-95 transition-all justify-center"
              >
                {t("form.enter")}
              </button>
            </form>
          )}

          {tab === "cadastro" && (
            <form
              className="anim-in bg-white border border-slate-200 rounded-xl shadow-sm p-7 transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5"
              onSubmit={handleCadastro}
            >
              <div className="login-title text-slate-900">
                {t("form.titleCad")}
              </div>
              <div className="login-sub text-slate-500">{t("form.subCad")}</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div className="field">
                  <label className="text-slate-500">{t("form.nome")}</label>
                  <input
                    className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                    value={cadNome}
                    onChange={(e) => setCadNome(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="text-slate-500">
                    {t("form.sobrenome")}
                  </label>
                  <input
                    className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                    value={cadSobrenome}
                    onChange={(e) => setCadSobrenome(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label className="text-slate-500">{t("form.email")}</label>
                <input
                  type="email"
                  className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
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
                  <label className="text-slate-500">{t("form.senha")}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                    value={cadSenha}
                    onChange={(e) => setCadSenha(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="field">
                  <label className="text-slate-500">
                    {t("form.confirmar")}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                    value={cadConf}
                    onChange={(e) => setCadConf(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary w100 bg-none bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-lg shadow-sm active:scale-95 transition-all justify-center"
              >
                {t("form.criarConta")}
              </button>
            </form>
          )}

          {tab === "codigo" && (
            <form
              className="anim-in bg-white border border-slate-200 rounded-xl shadow-sm p-7 transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5"
              onSubmit={handleCodigo}
            >
              <div className="login-title text-slate-900">
                {t("form.titleCod")}
              </div>
              <div className="login-sub text-slate-500">{t("form.subCod")}</div>
              <div className="field">
                <label className="text-slate-500">{t("form.seuNome")}</label>
                <input
                  placeholder={t("form.comoChamado")}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                  value={jogNome}
                  onChange={(e) => setJogNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="text-slate-500">
                  {t("form.codigoSessao")}
                </label>
                <input
                  placeholder={t("form.codigoPlaceholder")}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
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
                className="btn btn-primary w100 bg-none bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-lg shadow-sm active:scale-95 transition-all justify-center"
              >
                {t("form.entrarJogo")}
              </button>
              <div style={{ marginTop: 12 }}>
                <div className="code-blk bg-none bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5">
                  <div className="code-gem bg-indigo-50 border border-indigo-200 text-[#6366F1]">
                    <GemLogo size={20} />
                  </div>
                  <div>
                    <div
                      className="small muted text-slate-900"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {t("form.codeHint1")}
                    </div>
                    <div
                      className="small muted text-slate-500"
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
            <form
              className="anim-in bg-white border border-slate-200 rounded-xl shadow-sm p-7 transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5"
              onSubmit={handleMentor}
            >
              <div className="login-title text-slate-900">
                {t("form.titleMentor")}
              </div>
              <div className="login-sub text-slate-500">
                {t("form.subMentor")}
              </div>
              <div className="field">
                <label className="text-slate-500">{t("form.seuNome")}</label>
                <input
                  placeholder={t("form.comoChamado")}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                  value={mentNome}
                  onChange={(e) => setMentNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="text-slate-500">
                  {t("form.codigoMentores")}
                </label>
                <input
                  placeholder={t("form.codigoPlaceholder")}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
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
                className="btn btn-primary w100 bg-none bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-lg shadow-sm active:scale-95 transition-all justify-center"
              >
                {t("form.entrarMentor")}
              </button>
            </form>
          )}
        </div>
      </div>
      <div
        className="bg-slate-50 text-slate-500 border-t border-slate-200"
        style={{
          textAlign: "center",
          padding: "18px 20px 24px",
          fontSize: 11,
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
          <h3 className="text-slate-900">{t("forgot.titulo")}</h3>
          {forgotSent ? (
            <p className="text-slate-500" style={{ fontSize: 12 }}>
              {t("forgot.enviado")}
            </p>
          ) : (
            <form onSubmit={handleForgot}>
              <p className="text-slate-500" style={{ fontSize: 12 }}>
                {t("forgot.sub")}
              </p>
              <div className="field">
                <label className="text-slate-500">{t("form.email")}</label>
                <input
                  type="email"
                  className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w100 bg-none bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-lg shadow-sm active:scale-95 transition-all justify-center"
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
