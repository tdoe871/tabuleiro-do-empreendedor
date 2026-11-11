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
      <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-5">
        {t("title")}
      </h3>
      {disabled && (
        <p className="field-error mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-600">
          {tCommon("errors.SUBMISSIONS_DISABLED")}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 text-slate-900">
        <div className="field space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t("chooseType")}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {TYPES.map((ty) => {
              const Icon = TYPE_ICON[ty];
              const selected = type === ty;
              return (
                <button
                  key={ty}
                  type="button"
                  className={`option-card bg-none flex items-center gap-3 p-3.5 bg-white border rounded-xl shadow-sm text-left transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5 ${
                    selected
                      ? "border-[#6366F1] ring-2 ring-[#6366F1]/15 text-slate-900"
                      : "border-slate-200 text-slate-700"
                  } disabled:opacity-50 disabled:pointer-events-none`}
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => {
                    setType(ty);
                    setUrlTouched(false);
                  }}
                >
                  <span
                    className={`option-card-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 ${
                      selected
                        ? "bg-indigo-50 border-indigo-200 text-[#6366F1]"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span
                    className={`option-card-title text-xs font-semibold transition-colors ${
                      selected ? "text-slate-900" : "text-slate-700"
                    }`}
                  >
                    {typeLabel[ty]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {needsUrl && (
          <div className="field space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t("urlLabel")}
            </label>
            <input
              type="url"
              placeholder={t("urlPlaceholder")}
              value={url}
              disabled={disabled}
              maxLength={2000}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setUrlTouched(true)}
              required
              className="w-full rounded-lg bg-white border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/15 transition-all disabled:opacity-50"
            />
            {urlTouched && !urlValid && (
              <p className="field-error text-xs font-medium text-red-600 mt-1">
                {t("invalidUrl")}
              </p>
            )}
          </div>
        )}

        <div className="field space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t("fileOrImage")}
          </label>
          <div className="flex flex-col gap-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl shadow-sm px-3.5 py-2.5 text-xs transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5"
              >
                <a
                  href={f.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate font-medium text-slate-900 hover:text-[#6366F1] transition-colors"
                >
                  {f.fileName}
                </a>
                <span className="text-slate-500 tabular-nums">
                  {formatSize(f.size)}
                </span>
                <button
                  type="button"
                  aria-label={t("removerArquivo")}
                  onClick={() => void handleDeleteFile(f.id)}
                  disabled={disabled}
                  className="flex items-center justify-center rounded-md p-1 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {files.length < MAX_FILES && (
              <button
                type="button"
                className="btn btn-ghost btn-sm bg-none inline-flex items-center justify-center gap-2 self-start rounded-lg bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 shadow-sm transition-all disabled:opacity-50"
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
              className="hidden"
              style={{ display: "none" }}
              onChange={(e) => {
                const selected = e.target.files?.[0];
                e.target.value = "";
                if (selected) void handleUpload(selected);
              }}
            />
            {needsFile && !fileValid && (
              <p className="field-error text-xs font-medium text-red-600">
                {t("fileRequired")}
              </p>
            )}
            <p className="field-hint text-[11px] text-slate-500">
              {t("fileHint")}
            </p>
          </div>
        </div>

        <div className="field space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t("linksExtraLabel")}
          </label>
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input
                type="url"
                placeholder="https://..."
                value={link}
                disabled={disabled}
                onChange={(e) => updateLink(i, e.target.value)}
                className="flex-1 rounded-lg bg-white border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/15 transition-all disabled:opacity-50"
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm bg-none inline-flex items-center justify-center rounded-lg bg-white hover:bg-slate-50 border border-slate-200 p-2.5 text-slate-600 hover:text-slate-900 shadow-sm transition-all disabled:opacity-50"
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
              className="btn btn-ghost btn-sm bg-none inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 shadow-sm transition-all disabled:opacity-50"
              onClick={addLink}
              disabled={disabled}
            >
              + {t("adicionarLink")}
            </button>
          )}
        </div>

        <div className="field space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t("descriptionLabel")}
          </label>
          <textarea
            placeholder={t("descriptionPlaceholder")}
            className="w-full min-h-[84px] resize-y rounded-lg bg-white border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/15 transition-all disabled:opacity-50"
            value={description}
            disabled={disabled}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            className="btn btn-ghost bg-none rounded-lg bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 shadow-sm transition-all disabled:opacity-50"
            onClick={onClose}
            disabled={saving}
          >
            {t("cancelar")}
          </button>
          <button
            type="submit"
            className="btn btn-primary bg-none inline-flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-lg px-5 py-2 text-xs shadow-sm active:scale-95 transition-all disabled:opacity-50"
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
