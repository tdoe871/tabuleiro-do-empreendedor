import { expect, test, type Page } from "@playwright/test";

import en from "../src/i18n/dictionaries/en.json";
import es from "../src/i18n/dictionaries/es.json";
import fr from "../src/i18n/dictionaries/fr.json";
import ptBR from "../src/i18n/dictionaries/pt-BR.json";

// The home page is the login screen for every role (educator login and sign
// up, player event code, mentor code). Every API call is mocked with
// page.route, so these tests never reach the backend or the database:
// @readonly, they also run against the deployed site.

const locales = [
  ["pt-BR", ptBR],
  ["es", es],
  ["en", en],
  ["fr", fr],
] as const;

type Dict = typeof ptBR;

// The tabs are clickable <div>s, not buttons, so find them by their text
// inside the tab bar.
const tab = (page: Page, name: string) =>
  page.locator(".login-tab", { hasText: name });

// Inputs have no accessible label (the <label> is not linked), so find them
// by the label text of their .field wrapper.
const field = (page: Page, label: string) =>
  page
    .locator(".field", {
      // Exact: "Nome" must not match "Sobrenome", nor "Nom" match "Prénom".
      has: page.locator("label").getByText(label, { exact: true }),
    })
    .locator("input");

const toast = (page: Page) => page.locator(".toast-item");

function mockApi(page: Page, path: string, status: number, body: unknown) {
  const calls: unknown[] = [];
  return page
    .route(`**${path}`, async (route) => {
      calls.push(route.request().postDataJSON());
      await route.fulfill({ status, json: body });
    })
    .then(() => calls);
}

test.describe("home / login screen", { tag: "@readonly" }, () => {
  test.describe("tabs", () => {
    for (const [locale, d] of locales) {
      test(`${locale}: each tab shows its own form`, async ({ page }) => {
        await page.goto(`/${locale}`);
        const forms: [string, string][] = [
          [d.login.tabs.login, d.login.form.titleEdu],
          [d.login.tabs.cadastro, d.login.form.titleCad],
          [d.login.tabs.codigo, d.login.form.titleCod],
          [d.login.tabs.mentor, d.login.form.titleMentor],
        ];
        for (const [tabName, title] of forms) {
          await tab(page, tabName).click();
          await expect(tab(page, tabName)).toHaveClass(/\bon\b/);
          await expect(page.locator(".login-title")).toHaveText(title);
        }
      });
    }
  });

  test.describe("language switcher", () => {
    for (const [locale, d] of locales) {
      test(`switches to ${locale} and keeps it in the URL`, async ({
        page,
      }) => {
        const start = locale === "en" ? "es" : "en";
        await page.goto(`/${start}`);
        const label = { "pt-BR": "PT", es: "ES", en: "EN", fr: "FR" }[locale];
        await page.locator(".lang-btn", { hasText: label }).click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/?$`));
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.getByText(d.login.heroTag)).toBeVisible();
        await expect(page.locator(".lang-btn.on")).toContainText(label);
      });
    }
  });

  test("the four key cards open and close their description", async ({
    page,
  }) => {
    await page.goto("/pt-BR");
    for (const id of [
      "problema",
      "solucao",
      "parcerias",
      "oportunidades",
    ] as const) {
      const key = ptBR.keys[id];
      const card = page.locator(".hc-card", { hasText: key.name });
      const firstParagraph = key.desc.split("\n\n")[0]!;
      await card.locator(".hc-head").click();
      await expect(card).toHaveClass(/\bopen\b/);
      await expect(card.getByText(firstParagraph)).toBeVisible();
      await card.locator(".hc-head").click();
      await expect(card.getByText(firstParagraph)).toHaveCount(0);
    }
  });

  test.describe("educator login", () => {
    for (const [locale, d] of locales) {
      test(`${locale}: wrong credentials show a translated error`, async ({
        page,
      }) => {
        const calls = await mockApi(page, "/api/auth/login", 401, {
          error: "INVALID_CREDENTIALS",
        });
        await page.goto(`/${locale}`);
        await field(page, d.login.form.email).fill("  Ana@Test.dev ");
        await field(page, d.login.form.senha).fill("wrong-password");
        await page.getByRole("button", { name: d.login.form.enter }).click();
        await expect(toast(page)).toHaveText(
          d.common.errors.INVALID_CREDENTIALS,
        );
        expect(calls).toHaveLength(1);
        expect(calls[0]).toMatchObject({ senha: "wrong-password" });
        await expect(page).toHaveURL(new RegExp(`/${locale}/?$`));
      });
    }

    test("too many attempts show the rate-limit message", async ({ page }) => {
      await mockApi(page, "/api/auth/login", 429, { error: "RATE_LIMITED" });
      await page.goto("/es");
      await field(page, es.login.form.email).fill("ana@test.dev");
      await field(page, es.login.form.senha).fill("whatever1");
      await page.getByRole("button", { name: es.login.form.enter }).click();
      await expect(toast(page)).toHaveText(es.common.errors.RATE_LIMITED);
    });

    test("a server error still shows a message instead of nothing", async ({
      page,
    }) => {
      await page.route("**/api/auth/login", (route) =>
        route.fulfill({ status: 500, body: "Internal Server Error" }),
      );
      await page.goto("/en");
      await field(page, en.login.form.email).fill("ana@test.dev");
      await field(page, en.login.form.senha).fill("whatever1");
      await page.getByRole("button", { name: en.login.form.enter }).click();
      await expect(toast(page)).toHaveText(en.login.toasts.invalidCredentials);
    });

    test("empty fields are blocked before calling the API", async ({
      page,
    }) => {
      const calls = await mockApi(page, "/api/auth/login", 200, {});
      await page.goto("/pt-BR");
      await page.getByRole("button", { name: ptBR.login.form.enter }).click();
      await expect(field(page, ptBR.login.form.email)).toHaveJSProperty(
        "validity.valueMissing",
        true,
      );
      expect(calls).toHaveLength(0);
    });

    test("success goes to the educator panel", async ({ page }) => {
      await mockApi(page, "/api/auth/login", 200, {
        staff: { id: "s1", name: "Ana", email: "ana@test.dev" },
      });
      // The panel itself needs a real session; only check where it navigates.
      await page.route("**/pt-BR/mestre/dashboard*", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<h1>panel</h1>",
        }),
      );
      await page.goto("/pt-BR");
      await field(page, ptBR.login.form.email).fill("ana@test.dev");
      await field(page, ptBR.login.form.senha).fill("right-password");
      await page.getByRole("button", { name: ptBR.login.form.enter }).click();
      await expect(page).toHaveURL(/\/pt-BR\/mestre\/dashboard/);
    });
  });

  test.describe("educator sign up", () => {
    async function fillSignUp(page: Page, d: Dict, confirm: string) {
      await tab(page, d.login.tabs.cadastro).click();
      await field(page, d.login.form.nome).fill("Ana");
      await field(page, d.login.form.sobrenome).fill("Silva");
      await field(page, d.login.form.email).fill("ana@test.dev");
      await field(page, d.login.form.senha).fill("password-123");
      await field(page, d.login.form.confirmar).fill(confirm);
      await page.getByRole("button", { name: d.login.form.criarConta }).click();
    }

    for (const [locale, d] of locales) {
      test(`${locale}: mismatched passwords are caught without calling the API`, async ({
        page,
      }) => {
        const calls = await mockApi(page, "/api/auth/register", 201, {});
        await page.goto(`/${locale}`);
        await fillSignUp(page, d as Dict, "password-456");
        await expect(toast(page)).toHaveText(d.login.toasts.passwordMismatch);
        expect(calls).toHaveLength(0);
      });
    }

    test("an email already in use shows a translated error", async ({
      page,
    }) => {
      await mockApi(page, "/api/auth/register", 409, { error: "EMAIL_TAKEN" });
      await page.goto("/fr");
      await fillSignUp(page, fr as Dict, "password-123");
      await expect(toast(page)).toHaveText(fr.common.errors.EMAIL_TAKEN);
    });

    test("passwords shorter than 8 characters are blocked by the form", async ({
      page,
    }) => {
      const calls = await mockApi(page, "/api/auth/register", 201, {});
      await page.goto("/pt-BR");
      await tab(page, ptBR.login.tabs.cadastro).click();
      await field(page, ptBR.login.form.senha).fill("short");
      await page
        .getByRole("button", { name: ptBR.login.form.criarConta })
        .click();
      await expect(field(page, ptBR.login.form.senha)).toHaveJSProperty(
        "validity.tooShort",
        true,
      );
      expect(calls).toHaveLength(0);
    });
  });

  test.describe("player event code", () => {
    test("goes to team selection with the code upper-cased and the name trimmed", async ({
      page,
    }) => {
      await page.route("**/pt-BR/team?*", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<h1>team</h1>",
        }),
      );
      await page.goto("/pt-BR");
      await tab(page, ptBR.login.tabs.codigo).click();
      await field(page, ptBR.login.form.seuNome).fill("  Maria  ");
      await field(page, ptBR.login.form.codigoSessao).fill(" abc123 ");
      await page
        .getByRole("button", { name: ptBR.login.form.entrarJogo })
        .click();
      await expect(page).toHaveURL(/\/pt-BR\/team\?/);
      const url = new URL(page.url());
      expect(url.searchParams.get("code")).toBe("ABC123");
      expect(url.searchParams.get("nickname")).toBe("Maria");
    });

    for (const [locale, d] of locales) {
      test(`${locale}: blank name or code shows a translated error`, async ({
        page,
      }) => {
        await page.goto(`/${locale}`);
        await tab(page, d.login.tabs.codigo).click();
        // Spaces pass the browser's "required" check but not the app's.
        await field(page, d.login.form.seuNome).fill("   ");
        await field(page, d.login.form.codigoSessao).fill("   ");
        await page
          .getByRole("button", { name: d.login.form.entrarJogo })
          .click();
        await expect(toast(page)).toHaveText(d.login.toasts.missingFields);
        await expect(page).toHaveURL(new RegExp(`/${locale}/?$`));
      });
    }
  });

  test.describe("mentor code", () => {
    test("a wrong code shows a translated error", async ({ page }) => {
      const calls = await mockApi(page, "/api/mentors", 404, {
        error: "EVENT_NOT_FOUND",
      });
      await page.goto("/es");
      await tab(page, es.login.tabs.mentor).click();
      await field(page, es.login.form.seuNome).fill(" Juan ");
      await field(page, es.login.form.codigoMentores).fill(" XYZ789 ");
      await page
        .getByRole("button", { name: es.login.form.entrarMentor })
        .click();
      await expect(toast(page)).toHaveText(es.common.errors.EVENT_NOT_FOUND);
      expect(calls[0]).toEqual({ name: "Juan", mentorCode: "XYZ789" });
    });
  });

  test.describe("forgot password", () => {
    for (const [locale, d] of locales) {
      test(`${locale}: sends the request in the page language and confirms`, async ({
        page,
      }) => {
        const calls = await mockApi(page, "/api/auth/password/forgot", 202, {});
        await page.goto(`/${locale}`);
        await field(page, d.login.form.email).fill("ana@test.dev");
        await page
          .getByRole("button", { name: d.login.form.esqueceuSenha })
          .click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByText(d.login.forgot.titulo)).toBeVisible();
        // The login email is carried over into the dialog.
        await expect(dialog.locator("input[type=email]")).toHaveValue(
          "ana@test.dev",
        );
        await dialog
          .getByRole("button", { name: d.login.forgot.enviar })
          .click();
        await expect(dialog.getByText(d.login.forgot.enviado)).toBeVisible();
        expect(calls[0]).toEqual({ email: "ana@test.dev", locale });
      });
    }

    test("Escape closes the dialog", async ({ page }) => {
      await page.goto("/pt-BR");
      await page
        .getByRole("button", { name: ptBR.login.form.esqueceuSenha })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  });
});
