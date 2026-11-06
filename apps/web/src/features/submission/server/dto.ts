import type { Submission, SubmissionFile } from "@tdoe/db";

// Response shapes for deliveries, shared by the submission endpoints, the
// player board and the educator overview.

export type SubmissionFileDTO = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  // Same-origin endpoint that redirects to a short-lived signed URL.
  downloadUrl: string;
};

export type SubmissionDTO = {
  type: Submission["type"];
  url: string | null;
  links: string[];
  description: string | null;
  submittedAt: string | null;
};

export function toFileDTO(
  file: Pick<SubmissionFile, "id" | "fileName" | "contentType" | "size">,
): SubmissionFileDTO {
  return {
    id: file.id,
    fileName: file.fileName,
    contentType: file.contentType,
    size: file.size,
    downloadUrl: `/api/submissions/files/${file.id}`,
  };
}

export function toSubmissionDTO(
  submission: Pick<
    Submission,
    "type" | "url" | "links" | "description" | "submittedAt"
  >,
): SubmissionDTO {
  return {
    type: submission.type,
    url: submission.url,
    links: submission.links,
    description: submission.description,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
  };
}
