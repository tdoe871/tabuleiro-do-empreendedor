"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Ban, FileImage, GitBranch, Loader2, Rocket, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { sendJson, readApiError, translateApiError } from "@/lib/api/client";
import type { SubmissionType } from "@/types/domain";
import type { BoardFile, BoardSubmission } from "./PlayerBoard";

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

const MAX_EXTRA_LINKS = 5;
const MAX_FILES = 5;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPT =
  "application/pdf,.doc,.docx,.ppt,.pptx,image/png,image/jpeg,image/webp";

// https:// only — matches features/submission/server/rules.ts (parseHttpsUrl).
function isHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !!parsed.hostname;
  } catch {
    return false;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubmissionModal({
  onClose,
  initialSubmission,
  initialFiles,
  submissionsEnabled,
  onChanged,
}: {
  onClose: () => void;
  initialSubmission: BoardSubmission | null;
  initialFiles: BoardFile[];
  submissionsEnabled: boolean;
  onChanged: () => void;
}) {
  const t = useTranslations("submission");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<SubmissionType>(
    initialSubmission?.type ?? "DEPLOY_LINK",
  );
  const [url, setUrl] = useState(initialSubmission?.url ?? "");
  const [links, setLinks] = useState<string[]>(initialSubmission?.links ?? []);
  const [description, setDescription] = useState(
    initialSubmission?.description ?? "",
  );
  const [files, setFiles] = useState<BoardFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [urlTouched, setUrlTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const disabled = !submissionsEnabled;
  const typeLabel: Record<SubmissionType, string> = {
    DEPLOY_LINK: t("deployLink"),
    REPO_LINK: t("repoLink"),
    FILE_OR_IMAGE: t("fileOrImage"),
    NONE: t("none"),
  };

  const needsUrl = type === "DEPLOY_LINK" || type === "REPO_LINK";
  const needsFile = type === "FILE_OR_IMAGE";
  const urlValid = !needsUrl || isHttpsUrl(url.trim());
  const fileValid = !needsFile || files.length > 0;

  function errMsg(code: string | undefined) {
    return translateApiError(tCommon, code, tCommon("errors.INTERNAL_ERROR"));
  }

  async function handleUpload(selected: File) {
    if (files.length >= MAX_FILES) {
      toast("err", t("maxArquivos"));
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      toast("err", t("fileTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const step1 = await sendJson("/api/submissions/files", "POST", {
        fileName: selected.name,
        contentType: selected.type,
        size: selected.size,
      });
      if (!step1.ok) {
        const err = await readApiError(step1);
        toast("err", errMsg(err?.error));
        return;
      }
      const body1 = (await step1.json()) as {
        file: BoardFile;
        uploadUrl: string;
      };
      const step2 = await fetch(body1.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": selected.type },
        body: selected,
      });
      if (!step2.ok) {
        toast("err", t("uploadFalhou"));
        return;
      }
      const step3 = await sendJson(
        `/api/submissions/files/${body1.file.id}/confirm`,
        "POST",
      );
      if (!step3.ok) {
        const err = await readApiError(step3);
        toast("err", errMsg(err?.error));
        return;
      }
      const body3 = (await step3.json()) as { file: BoardFile };
      setFiles((prev) => [...prev, body3.file]);
      onChanged();
      toast("ok", t("arquivoEnviado"));
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(fileId: string) {
    const res = await sendJson(`/api/submissions/files/${fileId}`, "DELETE");
    if (!res.ok && res.status !== 204) {
      const err = await readApiError(res);
      toast("err", errMsg(err?.error));
      return;
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    onChanged();
  }

  function updateLink(index: number, value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? value : l)));
  }

  function addLink() {
    if (links.length < MAX_EXTRA_LINKS) setLinks((prev) => [...prev, ""]);
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (needsUrl) setUrlTouched(true);
    if (!urlValid || !fileValid) return;

    const trimmedLinks = links.map((l) => l.trim()).filter(Boolean);
    if (trimmedLinks.some((l) => !isHttpsUrl(l))) {
      toast("err", t("invalidUrl"));
      return;
    }

    setSaving(true);
    try {
      const res = await sendJson("/api/submissions", "PUT", {
        type,
        url: needsUrl ? url.trim() : undefined,
        links: trimmedLinks,
        description: description.trim() || undefined,
      });
      if (!res.ok) {
        const err = await readApiError(res);
        toast("err", errMsg(err?.error));
        return;
      }
      toast("ok", t("saved"));
      onChanged();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={560}>
      <h3>{t("title")}</h3>
      {disabled && (
        <p className="field-error" style={{ marginBottom: 10 }}>
          {tCommon("errors.SUBMISSIONS_DISABLED")}
        </p>
      )}
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
                  className="option-card"
                  aria-pressed={selected}
                  disabled={disabled}
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
              disabled={disabled}
              maxLength={2000}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setUrlTouched(true)}
              required
            />
            {urlTouched && !urlValid && (
              <p className="field-error">{t("invalidUrl")}</p>
            )}
          </div>
        )}

        <div className="field">
          <label>{t("fileOrImage")}</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {files.map((f) => (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 11,
                }}
              >
                <a
                  href={f.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ flex: 1, color: "var(--t1)" }}
                >
                  {f.fileName}
                </a>
                <span style={{ color: "var(--t3)" }}>{formatSize(f.size)}</span>
                <button
                  type="button"
                  aria-label={t("removerArquivo")}
                  onClick={() => void handleDeleteFile(f.id)}
                  disabled={disabled}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {files.length < MAX_FILES && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t("enviando")}
                  </>
                ) : (
                  t("adicionarArquivo")
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              style={{ display: "none" }}
              onChange={(e) => {
                const selected = e.target.files?.[0];
                e.target.value = "";
                if (selected) void handleUpload(selected);
              }}
            />
            {needsFile && !fileValid && (
              <p className="field-error">{t("fileRequired")}</p>
            )}
            <p className="field-hint">{t("fileHint")}</p>
          </div>
        </div>

        <div className="field">
          <label>{t("linksExtraLabel")}</label>
          {links.map((link, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                type="url"
                placeholder="https://..."
                value={link}
                disabled={disabled}
                onChange={(e) => updateLink(i, e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeLink(i)}
                disabled={disabled}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {links.length < MAX_EXTRA_LINKS && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={addLink}
              disabled={disabled}
            >
              + {t("adicionarLink")}
            </button>
          )}
        </div>

        <div className="field">
          <label>{t("descriptionLabel")}</label>
          <textarea
            placeholder={t("descriptionPlaceholder")}
            style={{ height: 70, resize: "vertical" }}
            value={description}
            disabled={disabled}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            {t("cancelar")}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={disabled || saving}
          >
            {saving ? (
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
