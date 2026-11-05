import { expect, test } from "@playwright/test";

const locales = ["pt-BR", "es", "en", "fr"];

test.describe("smoke", () => {
  for (const locale of locales) {
    test(`/${locale} renders without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));

      const res = await page.goto(`/${locale}`);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveText("Tabuleiro do Empreendedor");
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
