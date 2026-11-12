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
      <div id="tela-login" className="bg-[#0b1321] text-[#f1f6ff]">
        <div className="login-hero bg-none bg-[#0b1321] text-[#f1f6ff] border-r border-[#2a3b52]">
          <div className="glow-prob" />
          <div className="glow-parc" />
          <div className="glow-opor" />
          <div className="hero-star">
            <StarWatermark />
          </div>
          <div className="login-hero-content anim-in">
            <div className="logo-row">
              <div className="logo-gem bg-[#202f54] border border-[#8b9fff] rounded-[10px] shadow-[0_0_18px_rgba(139,159,255,0.2)] transition-all duration-300">
                <GemLogo />
              </div>
              <div>
                <div className="logo-nm text-[#f1f6ff]">
                  {tCommon("appName")}
                </div>
                <div className="logo-sb text-[#9caec6]">TdoE</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <LangSwitcher />
              </div>
            </div>
            <div>
              <div className="hero-hl text-[#f1f6ff]">{t("heroHl")}</div>
              <div className="hero-jogo grad">{t("heroJogo")}</div>
              <div className="hero-tag text-[#9caec6]">{t("heroTag")}</div>
              <div className="hero-chips">
                {KEY_IDS.map((id) => {
                  const key = tKeys.raw(id) as KeyTranslation;
                  return (
                    <div
                      key={id}
                      className="badge transition-all duration-300 hover:border-[#8b9fff] hover:shadow-[0_0_16px_rgba(139,159,255,0.2)]"
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
          <div className="hero-foot text-[#9caec6]">© 2026 TdoE</div>
          <div className="hero-bar bg-none bg-[#8b9fff]" />
        </div>

        <div className="login-panel bg-none bg-[#0f1a2c] text-[#f1f6ff] border-l border-[#2a3b52]">
          <div className="login-tabs bg-[#121e30]/90 backdrop-blur-xl border border-[#2a3b52] rounded-2xl p-1.5 shadow-[0_0_22px_rgba(8,15,28,0.45)]">
            <div
              className={`login-tab rounded-[9px] transition-all duration-200 ${
                tab === "login"
                  ? "on !bg-[#202f54] !text-[#8b9fff] border border-[#8b9fff] shadow-[0_0_14px_rgba(139,159,255,0.2)]"
                  : "text-[#9caec6] hover:text-[#f1f6ff] hover:bg-[#1a2940]"
              }`}
              onClick={() => setTab("login")}
            >
              {t("tabs.login")}
            </div>
            <div
              className={`login-tab rounded-[9px] transition-all duration-200 ${
                tab === "cadastro"
                  ? "on !bg-[#202f54] !text-[#8b9fff] border border-[#8b9fff] shadow-[0_0_14px_rgba(139,159,255,0.2)]"
                  : "text-[#9caec6] hover:text-[#f1f6ff] hover:bg-[#1a2940]"
              }`}
              onClick={() => setTab("cadastro")}
            >
              {t("tabs.cadastro")}
            </div>
            <div
              className={`login-tab rounded-[9px] transition-all duration-200 ${
                tab === "codigo"
                  ? "on !bg-[#202f54] !text-[#8b9fff] border border-[#8b9fff] shadow-[0_0_14px_rgba(139,159,255,0.2)]"
                  : "text-[#9caec6] hover:text-[#f1f6ff] hover:bg-[#1a2940]"
              }`}
              onClick={() => setTab("codigo")}
            >
              {t("tabs.codigo")}
            </div>
            <div
              className={`login-tab rounded-[9px] transition-all duration-200 ${
                tab === "mentor"
                  ? "on !bg-[#202f54] !text-[#8b9fff] border border-[#8b9fff] shadow-[0_0_14px_rgba(139,159,255,0.2)]"
                  : "text-[#9caec6] hover:text-[#f1f6ff] hover:bg-[#1a2940]"
              }`}
              onClick={() => setTab("mentor")}
            >
              {t("tabs.mentor")}
            </div>
          </div>

          {tab === "login" && (
            <form
              className="anim-in bg-[#121e30]/90 backdrop-blur-xl border border-[#2a3b52] rounded-2xl p-7 transition-all duration-300 hover:bg-[#1a2644] hover:border-[#8b9fff] hover:shadow-[0_0_22px_rgba(139,159,255,0.2)]"
              onSubmit={handleLogin}
            >
              <div className="login-title text-[#f1f6ff]">
                {t("form.titleEdu")}
              </div>
              <div className="login-sub text-[#9caec6]">{t("form.subEdu")}</div>
              <div className="field">
                <label className="text-[#9caec6]">{t("form.email")}</label>
                <input
                  type="email"
                  className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="text-[#9caec6]">{t("form.senha")}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  required
                />
              </div>
              <div style={{ textAlign: "right", marginBottom: 10 }}>
                <button
                  type="button"
                  className="text-[#9caec6] hover:text-[#8b9fff] font-medium transition-colors"
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
                className="btn btn-primary w100 bg-none bg-[#8b9fff] hover:bg-[#9baeff] border border-[#8b9fff] text-[#0c1226] font-semibold rounded-[9px] shadow-[0_0_18px_rgba(139,159,255,0.28)] active:scale-95 transition-all justify-center"
              >
                {t("form.enter")}
              </button>
            </form>
          )}

          {tab === "cadastro" && (
            <form
              className="anim-in bg-[#121e30]/90 backdrop-blur-xl border border-[#2a3b52] rounded-2xl p-7 transition-all duration-300 hover:bg-[#1a2644] hover:border-[#8b9fff] hover:shadow-[0_0_22px_rgba(139,159,255,0.2)]"
              onSubmit={handleCadastro}
            >
              <div className="login-title text-[#f1f6ff]">
                {t("form.titleCad")}
              </div>
              <div className="login-sub text-[#9caec6]">{t("form.subCad")}</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div className="field">
                  <label className="text-[#9caec6]">{t("form.nome")}</label>
                  <input
                    className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
                    value={cadNome}
                    onChange={(e) => setCadNome(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="text-[#9caec6]">
                    {t("form.sobrenome")}
                  </label>
                  <input
                    className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
                    value={cadSobrenome}
                    onChange={(e) => setCadSobrenome(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label className="text-[#9caec6]">{t("form.email")}</label>
                <input
                  type="email"
                  className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
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
                  <label className="text-[#9caec6]">{t("form.senha")}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
                    value={cadSenha}
                    onChange={(e) => setCadSenha(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="field">
                  <label className="text-[#9caec6]">
                    {t("form.confirmar")}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
                    value={cadConf}
                    onChange={(e) => setCadConf(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary w100 bg-none bg-[#8b9fff] hover:bg-[#9baeff] border border-[#8b9fff] text-[#0c1226] font-semibold rounded-[9px] shadow-[0_0_18px_rgba(139,159,255,0.28)] active:scale-95 transition-all justify-center"
              >
                {t("form.criarConta")}
              </button>
            </form>
          )}

          {tab === "codigo" && (
            <form
              className="anim-in bg-[#121e30]/90 backdrop-blur-xl border border-[#2a3b52] rounded-2xl p-7 transition-all duration-300 hover:bg-[#1a2644] hover:border-[#8b9fff] hover:shadow-[0_0_22px_rgba(139,159,255,0.2)]"
              onSubmit={handleCodigo}
            >
              <div className="login-title text-[#f1f6ff]">
                {t("form.titleCod")}
              </div>
              <div className="login-sub text-[#9caec6]">{t("form.subCod")}</div>
              <div className="field">
                <label className="text-[#9caec6]">{t("form.seuNome")}</label>
                <input
                  placeholder={t("form.comoChamado")}
                  className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
                  value={jogNome}
                  onChange={(e) => setJogNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="text-[#9caec6]">
                  {t("form.codigoSessao")}
                </label>
                <input
                  placeholder={t("form.codigoPlaceholder")}
                  className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
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
                className="btn btn-primary w100 bg-none bg-[#8b9fff] hover:bg-[#9baeff] border border-[#8b9fff] text-[#0c1226] font-semibold rounded-[9px] shadow-[0_0_18px_rgba(139,159,255,0.28)] active:scale-95 transition-all justify-center"
              >
                {t("form.entrarJogo")}
              </button>
              <div style={{ marginTop: 12 }}>
                <div className="code-blk bg-none bg-[#172744] border border-[#2a3b52] rounded-2xl transition-all duration-300 hover:bg-[#1a2644] hover:border-[#8b9fff] hover:shadow-[0_0_22px_rgba(139,159,255,0.2)]">
                  <div className="code-gem bg-[#202f54] border border-[#8b9fff] text-[#8b9fff]">
                    <GemLogo size={20} />
                  </div>
                  <div>
                    <div
                      className="small muted text-[#f1f6ff]"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#f1f6ff",
                      }}
                    >
                      {t("form.codeHint1")}
                    </div>
                    <div
                      className="small muted text-[#9caec6]"
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
              className="anim-in bg-[#121e30]/90 backdrop-blur-xl border border-[#2a3b52] rounded-2xl p-7 transition-all duration-300 hover:bg-[#1a2644] hover:border-[#8b9fff] hover:shadow-[0_0_22px_rgba(139,159,255,0.2)]"
              onSubmit={handleMentor}
            >
              <div className="login-title text-[#f1f6ff]">
                {t("form.titleMentor")}
              </div>
              <div className="login-sub text-[#9caec6]">
                {t("form.subMentor")}
              </div>
              <div className="field">
                <label className="text-[#9caec6]">{t("form.seuNome")}</label>
                <input
                  placeholder={t("form.comoChamado")}
                  className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
                  value={mentNome}
                  onChange={(e) => setMentNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="text-[#9caec6]">
                  {t("form.codigoMentores")}
                </label>
                <input
                  placeholder={t("form.codigoPlaceholder")}
                  className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
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
                className="btn btn-primary w100 bg-none bg-[#8b9fff] hover:bg-[#9baeff] border border-[#8b9fff] text-[#0c1226] font-semibold rounded-[9px] shadow-[0_0_18px_rgba(139,159,255,0.28)] active:scale-95 transition-all justify-center"
              >
                {t("form.entrarMentor")}
              </button>
            </form>
          )}
        </div>
      </div>
      <div
        className="bg-[#0b1321] text-[#9caec6] border-t border-[#2a3b52]"
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
          <h3 className="text-[#f1f6ff]">{t("forgot.titulo")}</h3>
          {forgotSent ? (
            <p className="text-[#9caec6]" style={{ fontSize: 12 }}>
              {t("forgot.enviado")}
            </p>
          ) : (
            <form onSubmit={handleForgot}>
              <p className="text-[#9caec6]" style={{ fontSize: 12 }}>
                {t("forgot.sub")}
              </p>
              <div className="field">
                <label className="text-[#9caec6]">{t("form.email")}</label>
                <input
                  type="email"
                  className="bg-[#1a2940] border border-[#2a3b52] rounded-[8px] text-[#f1f6ff] placeholder:text-[#8594b0] focus:bg-[#202f54] focus:border-[#8b9fff] focus:ring-2 focus:ring-[#8b9fff]/20 transition-all"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w100 bg-none bg-[#8b9fff] hover:bg-[#9baeff] border border-[#8b9fff] text-[#0c1226] font-semibold rounded-[9px] shadow-[0_0_18px_rgba(139,159,255,0.28)] active:scale-95 transition-all justify-center"
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
