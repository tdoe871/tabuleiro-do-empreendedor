"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import type { EduSession } from "./EducadorPanel";

function randomCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: len },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export function CreateSessionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (session: EduSession) => void;
}) {
  const t = useTranslations("educador.modalSessao");
  const tToast = useTranslations("educador.toasts");
  const toast = useToast();

  const [titulo, setTitulo] = useState("");
  const [modo, setModo] = useState<"escolar" | "personalizado">("escolar");
  const [cenario, setCenario] = useState("");
  const [numEquipes, setNumEquipes] = useState(5);
  const [integrantes, setIntegrantes] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      toast("err", tToast("tituloObrigatorio"));
      return;
    }
    if (modo === "personalizado" && !cenario.trim()) {
      toast("err", tToast("contextoObrigatorio"));
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo,
        modo,
        cenario: cenario || null,
        numEquipes,
        integrantes,
      }),
    });
    const codigo = randomCode();
    if (res.status === 501) {
      toast("info", tToast("backendPendente"));
    } else if (res.ok) {
      toast("ok", tToast("sessaoCriada", { code: codigo }));
    } else {
      toast("err", tToast("erroCriar"));
    }
    onCreated({
      id: crypto.randomUUID(),
      titulo,
      codigo,
      status: "aguardando",
      numEquipes,
      integrantes,
      modo,
      cenario: cenario || null,
    });
  }

  return (
    <Modal onClose={onClose} maxWidth={480}>
      <h3>{t("titulo")}</h3>
      <p>{t("sub")}</p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>{t("tituloLabel")}</label>
          <input
            placeholder={t("tituloPlaceholder")}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label>{t("modoLabel")}</label>
          <select
            value={modo}
            onChange={(e) =>
              setModo(e.target.value as "escolar" | "personalizado")
            }
          >
            <option value="escolar">{t("modoEscolar")}</option>
            <option value="personalizado">{t("modoPersonalizado")}</option>
          </select>
        </div>
        {modo === "personalizado" && (
          <div className="field">
            <label>{t("contextoLabel")}</label>
            <input
              placeholder={t("contextoPlaceholder")}
              value={cenario}
              onChange={(e) => setCenario(e.target.value)}
            />
            <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 4 }}>
              {t("contextoAjuda")}
            </div>
          </div>
        )}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div className="field">
            <label>{t("numEquipesLabel")}</label>
            <input
              type="number"
              min={1}
              max={80}
              value={numEquipes}
              onChange={(e) => setNumEquipes(Number(e.target.value))}
              onBlur={(e) =>
                setNumEquipes(
                  Math.min(80, Math.max(1, Number(e.target.value) || 1)),
                )
              }
            />
            <div className="field-hint">{t("numEquipesHint")}</div>
          </div>
          <div className="field">
            <label>{t("integrantesLabel")}</label>
            <select
              value={integrantes}
              onChange={(e) => setIntegrantes(Number(e.target.value))}
            >
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={6}>6</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("cancelar")}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {t("criar")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
