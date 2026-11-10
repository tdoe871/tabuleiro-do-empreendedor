/**
 * @jest-environment node
 */
const send = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
}));

import { escapeHtml, sendEmail } from "@/lib/email/send";

const message = {
  to: "ana@ejemplo.com",
  subject: "Hola",
  html: "<p>Hola</p>",
  text: "Hola",
};

describe("sendEmail", () => {
  const env = { ...process.env };
  // NODE_ENV is typed read-only; tests need to switch it.
  const setNodeEnv = (value: string) => {
    (process.env as Record<string, string | undefined>).NODE_ENV = value;
  };

  beforeEach(() => {
    send.mockReset();
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  it("sends through Resend with the configured sender", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.MAIL_FROM = "Tabuleiro <no-reply@ejemplo.com>";
    send.mockResolvedValue({ data: { id: "email-1" }, error: null });

    await expect(
      sendEmail({ ...message, idempotencyKey: "reset/1" }),
    ).resolves.toEqual({ ok: true, id: "email-1" });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Tabuleiro <no-reply@ejemplo.com>",
        to: "ana@ejemplo.com",
      }),
      { idempotencyKey: "reset/1" },
    );
  });

  it("reports SEND_FAILED when Resend returns an error or throws", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.MAIL_FROM = "no-reply@ejemplo.com";
    send.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error" },
    });
    await expect(sendEmail(message)).resolves.toEqual({
      ok: false,
      reason: "SEND_FAILED",
    });

    send.mockRejectedValueOnce(new Error("network"));
    await expect(sendEmail(message)).resolves.toEqual({
      ok: false,
      reason: "SEND_FAILED",
    });
  });

  it("logs instead of sending in development without a key", async () => {
    delete process.env.RESEND_API_KEY;
    setNodeEnv("development");
    await expect(sendEmail(message)).resolves.toEqual({ ok: true, id: null });
    expect(send).not.toHaveBeenCalled();
  });

  it("fails closed in production without a key", async () => {
    delete process.env.RESEND_API_KEY;
    setNodeEnv("production");
    await expect(sendEmail(message)).resolves.toEqual({
      ok: false,
      reason: "NOT_CONFIGURED",
    });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<b>"Ana" & 'Bo'</b>`)).toBe(
      "&lt;b&gt;&quot;Ana&quot; &amp; &#39;Bo&#39;&lt;/b&gt;",
    );
  });
});
