"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import type { SubmissionType } from "@/types/domain";

export interface SubmissionData {
  type: SubmissionType;
  url?: string;
  description?: string;
}

const TYPES: SubmissionType[] = [
  "DEPLOY_LINK",
  "REPO_LINK",
  "FILE_OR_IMAGE",
  "NONE",
];

export function SubmissionModal({
  onClose,
  initial,
  onSaved,
}: {
  onClose: () => void;
  initial: SubmissionData | null;
  onSaved: (data: SubmissionData) => void;
}) {
  const t = useTranslations("submission");
  const toast = useToast();

  const [type, setType] = useState<SubmissionType>(
    initial?.type ?? "DEPLOY_LINK",
  );
  const [url, setUrl] = useState(initial?.url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  const typeLabel: Record<SubmissionType, string> = {
    DEPLOY_LINK: t("deployLink"),
    REPO_LINK: t("repoLink"),
    FILE_OR_IMAGE: t("fileOrImage"),
    NONE: t("none"),
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/submissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        url: url || undefined,
        description: description || undefined,
      }),
    });
    if (res.status !== 501 && !res.ok) {
      toast("err", "Error");
      return;
    }
    toast("info", t("saved"));
    onSaved({
      type,
      url: url || undefined,
      description: description || undefined,
    });
    onClose();
  }

  return (
    <Modal onClose={onClose} maxWidth={480}>
      <h3>{t("title")}</h3>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>{t("chooseType")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SubmissionType)}
          >
            {TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {typeLabel[ty]}
              </option>
            ))}
          </select>
        </div>

        {(type === "DEPLOY_LINK" || type === "REPO_LINK") && (
          <div className="field">
            <label>{t("urlLabel")}</label>
            <input
              type="url"
              placeholder={t("urlPlaceholder")}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
        )}

        {type === "FILE_OR_IMAGE" && (
          <div className="field">
            <label>{t("fileOrImage")}</label>
            <input type="file" accept="image/*,.pdf" />
          </div>
        )}

        <div className="field">
          <label>{t("descriptionLabel")}</label>
          <textarea
            placeholder={t("descriptionPlaceholder")}
            style={{ height: 70, resize: "vertical" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            {t("submit")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
