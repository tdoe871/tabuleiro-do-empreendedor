"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Ban, FileImage, GitBranch, Loader2, Rocket } from "lucide-react";
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

const TYPE_ICON: Record<SubmissionType, typeof Rocket> = {
  DEPLOY_LINK: Rocket,
  REPO_LINK: GitBranch,
  FILE_OR_IMAGE: FileImage,
  NONE: Ban,
};

const URL_MAX_LENGTH = 2048;
const DESCRIPTION_MAX_LENGTH = 500;
const FILE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

// Only http(s) may ever reach an href/fetch built from user input — blocks
// javascript:, data:, file:, vbscript: etc. being stored as a "deploy link".
function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

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
  const [file, setFile] = useState<File | null>(null);
  const [urlTouched, setUrlTouched] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const typeLabel: Record<SubmissionType, string> = {
    DEPLOY_LINK: t("deployLink"),
    REPO_LINK: t("repoLink"),
    FILE_OR_IMAGE: t("fileOrImage"),
    NONE: t("none"),
  };

  const needsUrl = type === "DEPLOY_LINK" || type === "REPO_LINK";
  const needsFile = type === "FILE_OR_IMAGE";
  const urlValid = !needsUrl || isSafeHttpUrl(url.trim());
  const fileValid = !needsFile || (file !== null && !fileError);
  const canSubmit = urlValid && fileValid && !submitting;

  function handleFileChange(selected: File | null) {
    if (!selected) {
      setFile(null);
      setFileError(null);
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(selected.type)) {
      setFile(null);
      setFileError(t("fileInvalidType"));
      return;
    }
    if (selected.size > FILE_MAX_BYTES) {
      setFile(null);
      setFileError(t("fileTooLarge"));
      return;
    }
    setFile(selected);
    setFileError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      if (needsUrl) setUrlTouched(true);
      if (needsFile && !file) setFileError(t("fileRequired"));
      return;
    }

    setSubmitting(true);
    try {
      let res: Response;
      if (needsFile && file) {
        const formData = new FormData();
        formData.append("type", type);
        formData.append("file", file);
        if (description) formData.append("description", description);
        res = await fetch("/api/submissions", {
          method: "PUT",
          body: formData,
        });
      } else {
        const trimmedUrl = needsUrl ? url.trim() : undefined;
        res = await fetch("/api/submissions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            url: trimmedUrl,
            description: description || undefined,
          }),
        });
      }

      if (res.status !== 501 && !res.ok) {
        toast("err", "Error");
        return;
      }
      toast("info", t("saved"));
      onSaved({
        type,
        url: needsUrl ? url.trim() : undefined,
        description: description || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <h3>{t("title")}</h3>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>{t("chooseType")}</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
            }}
          >
            {TYPES.map((ty) => {
              const Icon = TYPE_ICON[ty];
              const selected = type === ty;
              return (
                <button
                  key={ty}
                  type="button"
                  className="option-card bg-[#14161C]/80 backdrop-blur-2xl border border-white/10 rounded-2xl transition-all duration-200 hover:border-white/20"
                  aria-pressed={selected}
                  onClick={() => {
                    setType(ty);
                    setUrlTouched(false);
                  }}
                >
                  <span className="option-card-icon">
                    <Icon size={16} />
                  </span>
                  <span className="option-card-title">{typeLabel[ty]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {needsUrl && (
          <div className="field">
            <label>{t("urlLabel")}</label>
            <input
              type="url"
              placeholder={t("urlPlaceholder")}
              value={url}
              maxLength={URL_MAX_LENGTH}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setUrlTouched(true)}
              required
            />
            {urlTouched && !urlValid && (
              <p className="field-error">{t("invalidUrl")}</p>
            )}
          </div>
        )}

        {needsFile && (
          <div className="field">
            <label>{t("fileOrImage")}</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {fileError ? (
              <p className="field-error">{fileError}</p>
            ) : (
              <p className="field-hint">{t("fileHint")}</p>
            )}
          </div>
        )}

        <div className="field">
          <label>{t("descriptionLabel")}</label>
          <textarea
            placeholder={t("descriptionPlaceholder")}
            style={{ height: 70, resize: "vertical" }}
            value={description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="field-count">
            {description.length}/{DESCRIPTION_MAX_LENGTH}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary bg-gradient-to-r from-[#B7FF5A] to-[#0FD4B0] text-black font-extrabold uppercase border-none shadow-[0_0_20px_-5px_rgba(183,255,90,0.4)] hover:opacity-90 transition-all rounded-xl cursor-pointer"
            disabled={!canSubmit}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("submit")
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
