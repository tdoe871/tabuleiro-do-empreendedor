import { expect, test } from "@playwright/test";

import ptBR from "../src/i18n/dictionaries/pt-BR.json";

// The educator, player and mentor areas are guarded in src/proxy.ts: without
// a valid session the request is redirected to the login screen before any
// page content is rendered. @readonly: no session is ever created.

const PROTECTED = [
  "/pt-BR/mestre/dashboard",
  "/pt-BR/mestre/socializacao",
  "/pt-BR/jogador/dashboard",
  "/pt-BR/mentor/dashboard",
];

test.describe("protected areas without a session", { tag: "@readonly" }, () => {
  for (const path of PROTECTED) {
    test(`${path} redirects to the login screen`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/pt-BR\/?$/);
      await expect(page.getByText(ptBR.login.form.titleEdu)).toBeVisible();
    });

    test(`${path} answers with a bare redirect, not the panel`, async ({
      request,
    }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([302, 303, 307, 308]).toContain(res.status());
      expect(new URL(res.headers().location!, res.url()).pathname).toBe(
        "/pt-BR",
      );
      // Nothing of the panel ships in the redirect body.
      expect((await res.text()).length).toBeLessThan(200);
    });
  }

  test("a forged session cookie is not enough", async ({
    page,
    context,
    baseURL,
  }) => {
    const { hostname } = new URL(baseURL!);
    await context.addCookies(
      ["tdoe_staff", "tdoe_player", "tdoe_mentor"].map((name) => ({
        name,
        value: "eyJhbGciOiJIUzI1NiJ9.eyJraW5kIjoic3RhZmYifQ.forged",
        domain: hostname,
        path: "/",
      })),
    );
    for (const path of PROTECTED) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/pt-BR\/?$/);
    }
  });

  test.describe("path tricks are still guarded", () => {
    for (const [path, locale] of [
      ["/pt-BR/MESTRE/dashboard", "pt-BR"],
      ["/pt-BR/%6Destre/dashboard", "pt-BR"],
      ["/es/jogador/dashboard", "es"],
      ["/xx/mestre/dashboard", "pt-BR"],
    ] as const) {
      test(`${path} → /${locale}`, async ({ request }) => {
        const res = await request.get(path, { maxRedirects: 0 });
        expect([302, 303, 307, 308]).toContain(res.status());
        expect(new URL(res.headers().location!, res.url()).pathname).toBe(
          `/${locale}`,
        );
      });
    }
  });
});
