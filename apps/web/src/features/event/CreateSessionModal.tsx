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
      <h3 className="text-xl font-bold tracking-tight text-[#f4f0e5]">
        {t("titulo")}
      </h3>
      <p className="text-[#b8b0a3]">{t("sub")}</p>
      <form onSubmit={handleSubmit} className="text-[#f4f0e5]">
        <div className="field">
          <label className="text-[#b8b0a3]">{t("tituloLabel")}</label>
          <input
            className="w-full rounded-[8px] bg-[#302d28] border border-[#464036] px-3.5 py-2.5 text-sm text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:border-[#dab979] focus:outline-none transition-all duration-300"
            placeholder={t("tituloPlaceholder")}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label className="text-[#b8b0a3]">{t("modoLabel")}</label>
          <select
            className="w-full rounded-[8px] bg-[#302d28] border border-[#464036] px-3.5 py-2.5 text-sm text-[#f4f0e5] focus:border-[#dab979] focus:outline-none transition-all duration-300"
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
            <label className="text-[#b8b0a3]">{t("contextoLabel")}</label>
            <input
              className="w-full rounded-[8px] bg-[#302d28] border border-[#464036] px-3.5 py-2.5 text-sm text-[#f4f0e5] placeholder:text-[#b8b0a3]/60 focus:border-[#dab979] focus:outline-none transition-all duration-300"
              placeholder={t("contextoPlaceholder")}
              value={cenario}
              onChange={(e) => setCenario(e.target.value)}
            />
            <div
              className="text-[#b8b0a3]"
              style={{ fontSize: 10, marginTop: 4 }}
            >
              {t("contextoAjuda")}
            </div>
          </div>
        )}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div className="field">
            <label className="text-[#b8b0a3]">{t("numEquipesLabel")}</label>
            <input
              type="number"
              min={1}
              max={80}
              className="w-full rounded-[8px] bg-[#302d28] border border-[#464036] px-3.5 py-2.5 text-sm text-[#f4f0e5] focus:border-[#dab979] focus:outline-none transition-all duration-300"
              value={numEquipes}
              onChange={(e) => setNumEquipes(Number(e.target.value))}
              onBlur={(e) =>
                setNumEquipes(
                  Math.min(80, Math.max(1, Number(e.target.value) || 1)),
                )
              }
            />
            <div className="field-hint text-[#b8b0a3]">
              {t("numEquipesHint")}
            </div>
          </div>
          <div className="field">
            <label className="text-[#b8b0a3]">{t("integrantesLabel")}</label>
            <select
              className="w-full rounded-[8px] bg-[#302d28] border border-[#464036] px-3.5 py-2.5 text-sm text-[#f4f0e5] focus:border-[#dab979] focus:outline-none transition-all duration-300"
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
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-ghost bg-none bg-[#302d28] hover:bg-[#383126] border border-[#464036] text-[#b8b0a3] hover:text-[#f4f0e5] rounded-[8px] transition-all duration-300 active:scale-95"
            onClick={onClose}
          >
            {t("cancelar")}
          </button>
          <button
            type="submit"
            className="btn btn-primary bg-none bg-[#dab979] hover:bg-[#e4c98f] border border-[#dab979] text-[#211d13] font-semibold rounded-[8px] shadow-[0_0_15px_rgba(218,185,121,0.25)] active:scale-95 transition-all duration-300"
            disabled={submitting}
          >
            {t("criar")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
