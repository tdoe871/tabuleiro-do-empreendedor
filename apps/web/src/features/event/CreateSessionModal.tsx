"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import type { EventDTO } from "./EducadorPanel";

// Mirrors MIN_TEAM_SIZE/MAX_TEAM_SIZE in
// apps/web/src/features/event/server/event.ts — the backend rejects
// anything outside this range, so the picker must not offer it.
const TEAM_SIZE_OPTIONS = [2, 3, 4, 5];
// Mirrors MIN/MAX_EVENT_DURATION_HOURS in the same file: how long the board
// stays open once the educator starts the session.
const MIN_DURATION_HOURS = 1;
const MAX_DURATION_HOURS = 48;
const DEFAULT_DURATION_HOURS = 24;

function clampHours(value: number): number {
  const hours = Math.round(value);
  if (!Number.isFinite(hours) || hours < MIN_DURATION_HOURS) {
    return DEFAULT_DURATION_HOURS;
  }
  return Math.min(MAX_DURATION_HOURS, hours);
}

export function CreateSessionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (event: EventDTO) => void;
}) {
  const t = useTranslations("educador.modalSessao");
  const tToast = useTranslations("educador.toasts");
  const tCommon = useTranslations("common");
  const toast = useToast();

  const [titulo, setTitulo] = useState("");
  const [modo, setModo] = useState<"escolar" | "personalizado">("escolar");
  const [cenario, setCenario] = useState("");
  const [numEquipes, setNumEquipes] = useState(5);
  const [integrantes, setIntegrantes] = useState(4);
  const [duracaoHoras, setDuracaoHoras] = useState(DEFAULT_DURATION_HOURS);
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
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          modo,
          cenario: cenario || null,
          numEquipes,
          integrantes,
          duracaoHoras: clampHours(duracaoHoras),
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        event?: EventDTO;
        error?: string;
      } | null;
      if (!res.ok || !body?.event) {
        const code = body?.error;
        toast(
          "err",
          code && tCommon.has(`errors.${code}`)
            ? tCommon(`errors.${code}`)
            : tToast("erroCriar"),
        );
        return;
      }
      toast("ok", tToast("sessaoCriada", { code: body.event.code }));
      onCreated(body.event);
      onClose();
    } finally {
      setSubmitting(false);
    }
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
              {TEAM_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>{t("duracaoLabel")}</label>
          <input
            type="number"
            min={MIN_DURATION_HOURS}
            max={MAX_DURATION_HOURS}
            step={1}
            value={duracaoHoras}
            onChange={(e) => setDuracaoHoras(Number(e.target.value))}
            onBlur={(e) => setDuracaoHoras(clampHours(Number(e.target.value)))}
          />
          <div className="field-hint">{t("duracaoHint")}</div>
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
