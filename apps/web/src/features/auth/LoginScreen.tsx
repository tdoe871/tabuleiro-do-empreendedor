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
      <div id="tela-login" className="bg-[#151411] text-[#f4f0e5]">
        <div className="login-hero bg-none bg-[#151411] text-[#f4f0e5] border-r border-[#464036]">
          <div className="glow-prob" />
          <div className="glow-parc" />
          <div className="glow-opor" />
          <div className="hero-star">
            <StarWatermark />
          </div>
          <div className="login-hero-content anim-in">
            <div className="logo-row">
              <div className="logo-gem bg-[#383126] border border-[#dab979] rounded-[8px] shadow-[0_0_18px_rgba(218,185,121,0.16)] transition-all duration-300">
                <GemLogo />
              </div>
              <div>
                <div className="logo-nm text-[#f4f0e5]">
                  {tCommon("appName")}
                </div>
                <div className="logo-sb text-[#b8b0a3]">TdoE</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <LangSwitcher />
              </div>
            </div>
            <div>
              <div className="hero-hl text-[#f4f0e5]">{t("heroHl")}</div>
              <div className="hero-jogo grad">{t("heroJogo")}</div>
              <div className="hero-tag text-[#b8b0a3]">{t("heroTag")}</div>
              <div className="hero-chips">
                {KEY_IDS.map((id) => {
                  const key = tKeys.raw(id) as KeyTranslation;
                  return (
                    <div
                      key={id}
                      className="badge transition-all duration-300 hover:border-[#dab979] hover:shadow-[0_0_16px_rgba(218,185,121,0.16)]"
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
          <div className="hero-foot text-[#b8b0a3]">© 2026 TdoE</div>
          <div className="hero-bar bg-none bg-[#dab979]" />
        </div>

        <div className="login-panel bg-none bg-[#191816] text-[#f4f0e5] border-l border-[#464036]">
          <div className="login-tabs bg-[#24221f]/90 backdrop-blur-xl border border-[#464036] rounded-xl p-1.5 shadow-[0_0_22px_rgba(0,0,0,0.45)]">
            <div
              className={`login-tab rounded-[8px] transition-all duration-300 active:scale-95 ${
                tab === "login"
                  ? "on !bg-[#383126] !text-[#dab979] border border-[#dab979] shadow-[0_0_14px_rgba(218,185,121,0.16)]"
                  : "text-[#b8b0a3] hover:text-[#f4f0e5] hover:bg-[#302d28]"
              }`}
              onClick={() => setTab("login")}
            >
              {t("tabs.login")}
            </div>
            <div
              className={`login-tab rounded-[8px] transition-all duration-300 active:scale-95 ${
                tab === "cadastro"
                  ? "on !bg-[#383126] !text-[#dab979] border border-[#dab979] shadow-[0_0_14px_rgba(218,185,121,0.16)]"
                  : "text-[#b8b0a3] hover:text-[#f4f0e5] hover:bg-[#302d28]"
              }`}
              onClick={() => setTab("cadastro")}
            >
              {t("tabs.cadastro")}
            </div>
            <div
              className={`login-tab rounded-[8px] transition-all duration-300 active:scale-95 ${
                tab === "codigo"
                  ? "on !bg-[#383126] !text-[#dab979] border border-[#dab979] shadow-[0_0_14px_rgba(218,185,121,0.16)]"
                  : "text-[#b8b0a3] hover:text-[#f4f0e5] hover:bg-[#302d28]"
              }`}
              onClick={() => setTab("codigo")}
            >
              {t("tabs.codigo")}
            </div>
            <div
              className={`login-tab rounded-[8px] transition-all duration-300 active:scale-95 ${
                tab === "mentor"
                  ? "on !bg-[#383126] !text-[#dab979] border border-[#dab979] shadow-[0_0_14px_rgba(218,185,121,0.16)]"
                  : "text-[#b8b0a3] hover:text-[#f4f0e5] hover:bg-[#302d28]"
              }`}
              onClick={() => setTab("mentor")}
            >
              {t("tabs.mentor")}
            </div>
          </div>

          {tab === "login" && (
            <form
              className="anim-in bg-[#24221f]/90 backdrop-blur-xl border border-[#464036] rounded-xl p-7 transition-all duration-300 hover:bg-[#383126] hover:border-[#dab979] hover:shadow-[0_0_22px_rgba(218,185,121,0.16)]"
              onSubmit={handleLogin}
            >
              <div className="login-title text-[#f4f0e5]">
                {t("form.titleEdu")}
              </div>
              <div className="login-sub text-[#b8b0a3]">{t("form.subEdu")}</div>
              <div className="field">
                <label className="text-[#b8b0a3]">{t("form.email")}</label>
                <input
                  type="email"
                  className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="text-[#b8b0a3]">{t("form.senha")}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  required
                />
              </div>
              <div style={{ textAlign: "right", marginBottom: 10 }}>
                <button
                  type="button"
                  className="text-[#b8b0a3] hover:text-[#dab979] font-medium transition-colors"
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
                className="btn btn-primary w100 bg-none bg-[#dab979] hover:bg-[#e4c98f] border border-[#dab979] text-[#211d13] font-semibold rounded-[8px] shadow-[0_0_15px_rgba(218,185,121,0.25)] active:scale-95 transition-all duration-300 justify-center"
              >
                {t("form.enter")}
              </button>
            </form>
          )}

          {tab === "cadastro" && (
            <form
              className="anim-in bg-[#24221f]/90 backdrop-blur-xl border border-[#464036] rounded-xl p-7 transition-all duration-300 hover:bg-[#383126] hover:border-[#dab979] hover:shadow-[0_0_22px_rgba(218,185,121,0.16)]"
              onSubmit={handleCadastro}
            >
              <div className="login-title text-[#f4f0e5]">
                {t("form.titleCad")}
              </div>
              <div className="login-sub text-[#b8b0a3]">{t("form.subCad")}</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div className="field">
                  <label className="text-[#b8b0a3]">{t("form.nome")}</label>
                  <input
                    className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
                    value={cadNome}
                    onChange={(e) => setCadNome(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="text-[#b8b0a3]">
                    {t("form.sobrenome")}
                  </label>
                  <input
                    className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
                    value={cadSobrenome}
                    onChange={(e) => setCadSobrenome(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label className="text-[#b8b0a3]">{t("form.email")}</label>
                <input
                  type="email"
                  className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
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
                  <label className="text-[#b8b0a3]">{t("form.senha")}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
                    value={cadSenha}
                    onChange={(e) => setCadSenha(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="field">
                  <label className="text-[#b8b0a3]">
                    {t("form.confirmar")}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
                    value={cadConf}
                    onChange={(e) => setCadConf(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary w100 bg-none bg-[#dab979] hover:bg-[#e4c98f] border border-[#dab979] text-[#211d13] font-semibold rounded-[8px] shadow-[0_0_15px_rgba(218,185,121,0.25)] active:scale-95 transition-all duration-300 justify-center"
              >
                {t("form.criarConta")}
              </button>
            </form>
          )}

          {tab === "codigo" && (
            <form
              className="anim-in bg-[#24221f]/90 backdrop-blur-xl border border-[#464036] rounded-xl p-7 transition-all duration-300 hover:bg-[#383126] hover:border-[#dab979] hover:shadow-[0_0_22px_rgba(218,185,121,0.16)]"
              onSubmit={handleCodigo}
            >
              <div className="login-title text-[#f4f0e5]">
                {t("form.titleCod")}
              </div>
              <div className="login-sub text-[#b8b0a3]">{t("form.subCod")}</div>
              <div className="field">
                <label className="text-[#b8b0a3]">{t("form.seuNome")}</label>
                <input
                  placeholder={t("form.comoChamado")}
                  className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
                  value={jogNome}
                  onChange={(e) => setJogNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="text-[#b8b0a3]">
                  {t("form.codigoSessao")}
                </label>
                <input
                  placeholder={t("form.codigoPlaceholder")}
                  className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
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
                className="btn btn-primary w100 bg-none bg-[#dab979] hover:bg-[#e4c98f] border border-[#dab979] text-[#211d13] font-semibold rounded-[8px] shadow-[0_0_15px_rgba(218,185,121,0.25)] active:scale-95 transition-all duration-300 justify-center"
              >
                {t("form.entrarJogo")}
              </button>
              <div style={{ marginTop: 12 }}>
                <div className="code-blk bg-none bg-[#383126] border border-[#464036] rounded-xl transition-all duration-300 hover:bg-[#383126] hover:border-[#dab979] hover:shadow-[0_0_22px_rgba(218,185,121,0.16)]">
                  <div className="code-gem bg-[#383126] border border-[#dab979] text-[#dab979]">
                    <GemLogo size={20} />
                  </div>
                  <div>
                    <div
                      className="small muted text-[#f4f0e5]"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#f4f0e5",
                      }}
                    >
                      {t("form.codeHint1")}
                    </div>
                    <div
                      className="small muted text-[#b8b0a3]"
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
              className="anim-in bg-[#24221f]/90 backdrop-blur-xl border border-[#464036] rounded-xl p-7 transition-all duration-300 hover:bg-[#383126] hover:border-[#dab979] hover:shadow-[0_0_22px_rgba(218,185,121,0.16)]"
              onSubmit={handleMentor}
            >
              <div className="login-title text-[#f4f0e5]">
                {t("form.titleMentor")}
              </div>
              <div className="login-sub text-[#b8b0a3]">
                {t("form.subMentor")}
              </div>
              <div className="field">
                <label className="text-[#b8b0a3]">{t("form.seuNome")}</label>
                <input
                  placeholder={t("form.comoChamado")}
                  className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
                  value={mentNome}
                  onChange={(e) => setMentNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="text-[#b8b0a3]">
                  {t("form.codigoMentores")}
                </label>
                <input
                  placeholder={t("form.codigoPlaceholder")}
                  className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
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
                className="btn btn-primary w100 bg-none bg-[#dab979] hover:bg-[#e4c98f] border border-[#dab979] text-[#211d13] font-semibold rounded-[8px] shadow-[0_0_15px_rgba(218,185,121,0.25)] active:scale-95 transition-all duration-300 justify-center"
              >
                {t("form.entrarMentor")}
              </button>
            </form>
          )}
        </div>
      </div>
      <div
        className="bg-[#151411] text-[#b8b0a3] border-t border-[#464036]"
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
          <h3 className="text-[#f4f0e5]">{t("forgot.titulo")}</h3>
          {forgotSent ? (
            <p className="text-[#b8b0a3]" style={{ fontSize: 12 }}>
              {t("forgot.enviado")}
            </p>
          ) : (
            <form onSubmit={handleForgot}>
              <p className="text-[#b8b0a3]" style={{ fontSize: 12 }}>
                {t("forgot.sub")}
              </p>
              <div className="field">
                <label className="text-[#b8b0a3]">{t("form.email")}</label>
                <input
                  type="email"
                  className="bg-[#302d28] border border-[#464036] rounded-[8px] text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:bg-[#383126] focus:border-[#dab979] focus:ring-2 focus:ring-[#dab979]/20 transition-all duration-300"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w100 bg-none bg-[#dab979] hover:bg-[#e4c98f] border border-[#dab979] text-[#211d13] font-semibold rounded-[8px] shadow-[0_0_15px_rgba(218,185,121,0.25)] active:scale-95 transition-all duration-300 justify-center"
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
