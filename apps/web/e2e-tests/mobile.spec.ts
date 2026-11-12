import { devices, expect, test, type Page } from "@playwright/test";

import en from "../src/i18n/dictionaries/en.json";
import es from "../src/i18n/dictionaries/es.json";
import fr from "../src/i18n/dictionaries/fr.json";
import ptBR from "../src/i18n/dictionaries/pt-BR.json";

// Most players join from their phones. Checks the login screen at common
// phone sizes in every language (French and Portuguese strings are the
// longest). @readonly: nothing is submitted.

const locales = [
  ["pt-BR", ptBR],
  ["es", es],
  ["en", en],
  ["fr", fr],
] as const;

// Chromium emulation of each phone (defaultBrowserType cannot change inside
// a describe, so only the screen, touch and user agent are taken).
const phones = {
  "Android 360": {
    ...devices["Galaxy S9+"],
    viewport: { width: 360, height: 740 },
  },
  // Playwright's "iPhone SE" is the first generation: 320 px wide, the
  // narrowest screen still in use.
  "iPhone SE (320 px)": devices["iPhone SE"],
  "Pixel 7": devices["Pixel 7"],
};

// WCAG 2.2 AA minimum target size.
const MIN_TAP = 24;

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
}

// Visible elements whose text is wider than their own box and is cut off.
async function clippedText(page: Page) {
  return page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        "button, label, .login-tab, .login-title, .lang-btn",
      ),
    ]
      .filter((el) => {
        if (!el.offsetParent) return false;
        const style = getComputedStyle(el);
        const clips =
          style.overflowX === "hidden" || style.overflowX === "clip";
        return (
          el.scrollWidth > el.clientWidth + 1 &&
          (clips || style.whiteSpace === "nowrap")
        );
      })
      .map((el) => el.textContent?.trim()),
  );
}

for (const [phone, device] of Object.entries(phones)) {
  test.describe(`on ${phone}`, { tag: "@readonly" }, () => {
    test.use({
      viewport: device.viewport,
      userAgent: device.userAgent,
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
    });

    for (const [locale, d] of locales) {
      test(`${locale}: no sideways scroll and no clipped text`, async ({
        page,
      }) => {
        await page.goto(`/${locale}`);
        await expect(page.locator(".login-tab").first()).toBeVisible();
        for (const tabName of Object.values(d.login.tabs)) {
          await page.locator(".login-tab", { hasText: tabName }).tap();
          expect(
            await horizontalOverflow(page),
            `sideways scroll on "${tabName}"`,
          ).toBeLessThanOrEqual(0);
          expect(
            await clippedText(page),
            `clipped text on "${tabName}"`,
          ).toEqual([]);
        }
      });
    }

    test("tabs, language buttons and submit buttons are big enough to tap", async ({
      page,
    }) => {
      await page.goto("/pt-BR");
      const targets = page.locator(
        ".login-tab, .lang-btn, form button[type=submit]",
      );
      const count = await targets.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const target = targets.nth(i);
        const box = await target.boundingBox();
        const name = (await target.textContent())?.trim();
        expect(box, `${name} is not rendered`).not.toBeNull();
        expect(box!.width, `${name} width`).toBeGreaterThanOrEqual(MIN_TAP);
        expect(box!.height, `${name} height`).toBeGreaterThanOrEqual(MIN_TAP);
      }
    });

    test("inputs use at least 16px text so iPhones do not zoom in on focus", async ({
      page,
    }) => {
      await page.goto("/pt-BR");
      const small: string[] = [];
      for (const tabName of Object.values(ptBR.login.tabs)) {
        await page.locator(".login-tab", { hasText: tabName }).tap();
        small.push(
          ...(await page
            .locator("form input")
            .evaluateAll((inputs) =>
              inputs
                .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
                .map(
                  (el) =>
                    `${el.closest(".field")?.querySelector("label")?.textContent} (${getComputedStyle(el).fontSize})`,
                ),
            )),
        );
      }
      expect([...new Set(small)]).toEqual([]);
    });

    test("the player can type the event code with the on-screen keyboard", async ({
      page,
    }) => {
      await page.goto("/pt-BR");
      await page
        .locator(".login-tab", { hasText: ptBR.login.tabs.codigo })
        .tap();
      const submit = page.getByRole("button", {
        name: ptBR.login.form.entrarJogo,
      });
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport();
    });

    test("the forgot-password dialog fits on screen", async ({ page }) => {
      await page.goto("/pt-BR");
      await page
        .getByRole("button", { name: ptBR.login.form.esqueceuSenha })
        .tap();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      const viewport = page.viewportSize()!;
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      await expect(
        dialog.getByRole("button", { name: ptBR.login.forgot.enviar }),
      ).toBeInViewport();
    });
  });
}
