import { expect, test } from "@playwright/test";

import en from "../src/i18n/dictionaries/en.json";
import es from "../src/i18n/dictionaries/es.json";
import fr from "../src/i18n/dictionaries/fr.json";
import ptBR from "../src/i18n/dictionaries/pt-BR.json";

const locales = [
  ["pt-BR", ptBR],
  ["es", es],
  ["en", en],
  ["fr", fr],
] as const;

test.describe("smoke", () => {
  for (const [locale, dict] of locales) {
    test(`/${locale} renders without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));

      const res = await page.goto(`/${locale}`);
      expect(res?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByText(dict.common.appName).first()).toBeVisible();
      // Proves the page is actually translated, not just served at /<locale>
      await expect(page.getByText(dict.login.heroTag)).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("/ redirects to a supported locale", async ({ page }) => {
    await page.goto("/");
    expect(new URL(page.url()).pathname).toMatch(/^\/(pt-BR|es|en|fr)\/?$/);
  });

  test("API routes are not rewritten with a locale prefix", async ({
    request,
  }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });
});
