"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { GemLogo, StarWatermark } from "@/components/ui/GemLogo";
import { LangSwitcher } from "@/components/shared/LangSwitcher";
import { HeroConceitos } from "./HeroConceitos";
import {
  KEY_IDS,
  KEY_COLOR_VAR,
  type KeyTranslation,
} from "@/features/event/keys";
import { useToast } from "@/components/providers/ToastProvider";

type LoginTab = "login" | "cadastro" | "codigo";

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
  const [tab, setTab] = useState<LoginTab>("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  const [cadNome, setCadNome] = useState("");
  const [cadSobrenome, setCadSobrenome] = useState("");
  const [cadEmail, setCadEmail] = useState("");
  const [cadSenha, setCadSenha] = useState("");
  const [cadConf, setCadConf] = useState("");

  const [jogNome, setJogNome] = useState("");
  const [jogCodigo, setJogCodigo] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const res = await postJson("/api/auth/login", {
      email: loginEmail,
      senha: loginSenha,
    });
    if (res.status === 501) {
      toast(
        "info",
        "Login de educador: backend em construção — abrindo painel em modo de visualização.",
      );
      router.push("/mestre/dashboard");
      return;
    }
    if (res.ok) {
      router.push("/mestre/dashboard");
      return;
    }
    toast("err", "Credenciais inválidas");
  }

  async function handleCadastro(e: FormEvent) {
    e.preventDefault();
    if (cadSenha !== cadConf) {
      toast("err", "As senhas não coincidem");
      return;
    }
    const res = await postJson("/api/auth/register", {
      nome: cadNome,
      sobrenome: cadSobrenome,
      email: cadEmail,
      senha: cadSenha,
    });
    if (res.status === 501) {
      toast(
        "info",
        "Cadastro de educador: backend em construção — abrindo painel em modo de visualização.",
      );
      router.push("/mestre/dashboard");
      return;
    }
    if (res.ok) {
      router.push("/mestre/dashboard");
      return;
    }
    toast("err", "Não foi possível criar a conta");
  }

  function handleCodigo(e: FormEvent) {
    e.preventDefault();
    if (!jogNome.trim() || !jogCodigo.trim()) {
      toast("err", "Preencha seu nome e o código");
      return;
    }
    const params = new URLSearchParams({
      code: jogCodigo.trim().toUpperCase(),
      nickname: jogNome.trim(),
    });
    router.push(`/team?${params.toString()}`);
  }

  const footerLines = t("footer").split("\n");

  return (
    <>
      <div id="tela-login">
        <div className="login-hero">
          <div className="glow-prob" />
          <div className="glow-parc" />
          <div className="glow-opor" />
          <div className="hero-star">
            <StarWatermark />
          </div>
          <div className="login-hero-content anim-in">
            <div className="logo-row">
              <div className="logo-gem">
                <GemLogo />
              </div>
              <div>
                <div className="logo-nm">{tCommon("appName")}</div>
                <div className="logo-sb">TdoE</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <LangSwitcher />
              </div>
            </div>
            <div>
              <div className="hero-hl">{t("heroHl")}</div>
              <div className="hero-jogo grad">{t("heroJogo")}</div>
              <div className="hero-tag">{t("heroTag")}</div>
              <div className="hero-chips">
                {KEY_IDS.map((id) => {
                  const key = tKeys.raw(id) as KeyTranslation;
                  return (
                    <div
                      key={id}
                      className="badge"
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
          <div className="hero-foot">© 2026 TdoE</div>
          <div className="hero-bar" />
        </div>

        <div className="login-panel">
          <div className="login-tabs">
            <div
              className={`login-tab ${tab === "login" ? "on" : ""}`}
              onClick={() => setTab("login")}
            >
              {t("tabs.login")}
            </div>
            <div
              className={`login-tab ${tab === "cadastro" ? "on" : ""}`}
              onClick={() => setTab("cadastro")}
            >
              {t("tabs.cadastro")}
            </div>
            <div
              className={`login-tab ${tab === "codigo" ? "on" : ""}`}
              onClick={() => setTab("codigo")}
            >
              {t("tabs.codigo")}
            </div>
          </div>

          {tab === "login" && (
            <form className="anim-in" onSubmit={handleLogin}>
              <div className="login-title">{t("form.titleEdu")}</div>
              <div className="login-sub">{t("form.subEdu")}</div>
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
              <button type="submit" className="btn btn-primary w100">
                {t("form.enter")}
              </button>
            </form>
          )}

          {tab === "cadastro" && (
            <form className="anim-in" onSubmit={handleCadastro}>
              <div className="login-title">{t("form.titleCad")}</div>
              <div className="login-sub">{t("form.subCad")}</div>
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
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w100">
                {t("form.criarConta")}
              </button>
            </form>
          )}

          {tab === "codigo" && (
            <form className="anim-in" onSubmit={handleCodigo}>
              <div className="login-title">{t("form.titleCod")}</div>
              <div className="login-sub">{t("form.subCod")}</div>
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
              <button type="submit" className="btn btn-primary w100">
                {t("form.entrarJogo")}
              </button>
              <div style={{ marginTop: 12 }}>
                <div className="code-blk">
                  <div className="code-gem">
                    <GemLogo size={20} />
                  </div>
                  <div>
                    <div
                      className="small muted"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--t2)",
                      }}
                    >
                      {t("form.codeHint1")}
                    </div>
                    <div className="small muted" style={{ marginTop: 2 }}>
                      {t("form.codeHint2")}
                    </div>
                  </div>
                </div>
              </div>
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
    </>
  );
}
