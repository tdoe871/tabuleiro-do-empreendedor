import {
  ALLOWED_CONTENT_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/features/submission/server/rules";

// Supabase Storage for team deliveries, through its REST API with the secret
// key (server only; it bypasses RLS). The bucket is private: uploads use
// one-time signed upload URLs and downloads short-lived signed URLs, so the
// browser never gets a key.
//
// Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY.

export const SUBMISSIONS_BUCKET = "submissions";
const DOWNLOAD_URL_SECONDS = 60;

export class StorageError extends Error {}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new StorageError(
      "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is not set",
    );
  }
  return { base: `${url.replace(/\/$/, "")}/storage/v1`, key };
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function storageFetch(path: string, init: RequestInit = {}) {
  const { base, key } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  return fetch(`${base}${path}`, { ...init, headers, cache: "no-store" });
}

async function expectOk(response: Response, action: string) {
  if (!response.ok) {
    throw new StorageError(
      `${action} failed: ${response.status} ${await response.text()}`,
    );
  }
  return response;
}

// Creates the private bucket the first time it is needed, with the size and
// type limits enforced by Storage itself as a second line of defense.
let bucketReady: Promise<void> | null = null;
export function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const existing = await storageFetch(`/bucket/${SUBMISSIONS_BUCKET}`);
    if (existing.ok) return;
    const created = await storageFetch("/bucket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: SUBMISSIONS_BUCKET,
        name: SUBMISSIONS_BUCKET,
        public: false,
        file_size_limit: MAX_FILE_SIZE_BYTES,
        allowed_mime_types: ALLOWED_CONTENT_TYPES,
      }),
    });
    // Another instance may have created it at the same time.
    if (!created.ok && created.status !== 409) {
      const again = await storageFetch(`/bucket/${SUBMISSIONS_BUCKET}`);
      await expectOk(again, "Create bucket");
    }
  })().catch((error) => {
    bucketReady = null;
    throw error;
  });
  return bucketReady;
}

// One-time URL the browser PUTs the file to (with its Content-Type header).
export async function createSignedUploadUrl(path: string): Promise<string> {
  await ensureBucket();
  const response = await expectOk(
    await storageFetch(
      `/object/upload/sign/${SUBMISSIONS_BUCKET}/${encodePath(path)}`,
      { method: "POST" },
    ),
    "Sign upload",
  );
  const { url } = (await response.json()) as { url: string };
  return `${config().base}${url}`;
}

// First bytes of an uploaded object and its total size, or null when nothing
// was uploaded at that path.
export async function readObjectStart(
  path: string,
  bytes: number,
): Promise<{ start: Uint8Array; size: number } | null> {
  const response = await storageFetch(
    `/object/authenticated/${SUBMISSIONS_BUCKET}/${encodePath(path)}`,
    { headers: { Range: `bytes=0-${bytes - 1}` } },
  );
  if (response.status === 400 || response.status === 404) return null;
  await expectOk(response, "Read object");

  const start = new Uint8Array(await response.arrayBuffer()).slice(0, bytes);
  const total = response.headers.get("content-range")?.split("/")[1];
  const size = total ? Number(total) : start.length;
  return { start, size };
}

// Short-lived URL that downloads the file with its original name.
export async function createSignedDownloadUrl(
  path: string,
  fileName: string,
): Promise<string> {
  const response = await expectOk(
    await storageFetch(
      `/object/sign/${SUBMISSIONS_BUCKET}/${encodePath(path)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: DOWNLOAD_URL_SECONDS }),
      },
    ),
    "Sign download",
  );
  const { signedURL } = (await response.json()) as { signedURL: string };
  const url = new URL(`${config().base}${signedURL}`);
  url.searchParams.set("download", fileName);
  return url.toString();
}

export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await expectOk(
    await storageFetch(`/object/${SUBMISSIONS_BUCKET}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: paths }),
    }),
    "Remove objects",
  );
}
