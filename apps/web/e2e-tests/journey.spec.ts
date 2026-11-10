import {
  expect as baseExpect,
  test,
  type APIResponse,
  type Browser,
  type BrowserContext,
  type Response,
  type Page,
} from "@playwright/test";

import d from "../src/i18n/dictionaries/pt-BR.json";
import { E2E_EMAIL_DOMAIN } from "./support/cleanup";

// One full event, in order, through the real UI and the real backend: the
// educator signs up and creates a session, players join and form a team,
// play, chat and deliver, a mentor grades and the educator exports.
//
// @db: creates real rows in the database of apps/web/.env, all marked E2E- /
// @e2e.test and deleted before and after the run by support/cleanup.ts. Only
// runs with E2E_DB=1, never against a deployed site (playwright.config.ts).

test.describe.configure({ mode: "serial", timeout: 60_000 });

// Every step goes to the real database (far from a local machine) and the
// dev server compiles each page and route the first time it is used, so
// give the UI more than the default 5 s to catch up.
const expect = baseExpect.configure({ timeout: 15_000 });

const RUN = Date.now().toString(36).toUpperCase();
const EDUCATOR = {
  nome: "E2E",
  sobrenome: `Educadora ${RUN}`,
  email: `educadora-${RUN.toLowerCase()}${E2E_EMAIL_DOMAIN}`,
  senha: `E2E-senha-${RUN}`,
};
const SESSION_TITLE = `E2E-Sessão ${RUN}`;
const TEAM_NAME = `E2E-Equipe ${RUN}`;
const PHASE_1_ANSWER = `E2E resposta da fase 1 (${RUN})`;

// Shared by the steps below, filled in as the story goes.
const state = {
  eventId: "",
  eventCode: "",
  joinUrl: "",
  joinCode: "",
  mentorCode: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Each person gets their own browser and a fake client IP, so the per-IP rate
// limits (5 sign-ups per 15 min) do not trip when the suite runs repeatedly
// against the same local server.
let ipCounter = 0;
async function newPerson(browser: Browser, baseURL: string) {
  ipCounter += 1;
  const context = await browser.newContext({
    baseURL,
    // Like the players' phones: links without a locale open in pt-BR.
    locale: "pt-BR",
    extraHTTPHeaders: {
      "x-forwarded-for": `198.51.${((Date.now() / 1000) % 255) | 0}.${ipCounter}`,
    },
  });
  return { context, page: await context.newPage() };
}

const field = (page: Page, label: string) =>
  page
    .locator(".field", {
      has: page.locator("label").getByText(label, { exact: true }),
    })
    .locator("input, textarea, select");

const toast = (page: Page) => page.locator(".toast-item").last();
const tab = (page: Page, name: string) =>
  page.locator(".login-tab", { hasText: name });

// Phase names repeat across keys, so look inside the key's own card.
const phaseCell = (
  page: Page,
  key: keyof typeof d.jogador.fases,
  order: number,
) =>
  page
    .locator(".chave-card", {
      has: page.locator(".cc-name", { hasText: d.keys[key].name }),
    })
    .locator(".cc-fase")
    .nth(order - 1);

const toggle = (page: Page, label: string) =>
  page
    .locator(".timer-toggle-row", { hasText: label })
    .locator("label.toggle-sw");

// Works for API calls (page.request) and for responses caught in the browser
// (page.waitForResponse).
async function json<T = Record<string, unknown>>(
  res: APIResponse | Response,
): Promise<T> {
  expect(res.ok(), `${res.url()} → ${res.status()} ${await res.text()}`).toBe(
    true,
  );
  return (await res.json()) as T;
}

type Board = {
  me: { rpgRole: string | null };
  members: { id: string; nickname: string }[];
  keys: Record<
    string,
    { status: string; phases: Record<string, { status: string }> }
  >;
  event: { activityTimer: unknown; switches: Record<string, boolean> };
  submission: { type: string; url: string | null } | null;
  files: { id: string; downloadUrl: string }[];
};
// The educator panel does not remember the selected session across a
// reload, so pick it again from the sidebar.
async function reloadEducatorPanel(page: Page) {
  await page.reload();
  await page.locator(".sidebar").getByText(SESSION_TITLE).click();
  await expect(
    page.locator(".m-val", { hasText: state.eventCode }),
  ).toBeVisible();
}

const board = async (page: Page) =>
  json<Board>(await page.request.get("/api/board"));

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

let educator: { context: BrowserContext; page: Page };
let ana: { context: BrowserContext; page: Page }; // creates the team (leader)
let bruno: { context: BrowserContext; page: Page }; // joins by invite link
let mentor: { context: BrowserContext; page: Page };
const extra: BrowserContext[] = [];

test.beforeAll(async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL!;
  educator = await newPerson(browser, baseURL);
  ana = await newPerson(browser, baseURL);
  bruno = await newPerson(browser, baseURL);
  mentor = await newPerson(browser, baseURL);
});

test.afterAll(async () => {
  for (const ctx of [educator, ana, bruno, mentor]) await ctx?.context.close();
  for (const ctx of extra) await ctx.close();
});

async function stranger(browser: Browser, nickname: string, joinCode: string) {
  const person = await newPerson(browser, test.info().project.use.baseURL!);
  extra.push(person.context);
  await person.page.goto(`/pt-BR/team/join?code=${joinCode}`);
  await field(person.page, d.team.joinNicknameLabel).fill(nickname);
  await person.page.getByRole("button", { name: d.team.joinTeam }).click();
  return person.page;
}

// ---------------------------------------------------------------------------
// The event
// ---------------------------------------------------------------------------

test.describe("a full event", { tag: "@db" }, () => {
  test("the educator signs up and lands on an empty panel", async () => {
    const { page } = educator;
    await page.goto("/pt-BR");
    await tab(page, d.login.tabs.cadastro).click();
    await field(page, d.login.form.nome).fill(EDUCATOR.nome);
    await field(page, d.login.form.sobrenome).fill(EDUCATOR.sobrenome);
    await field(page, d.login.form.email).fill(EDUCATOR.email);
    await field(page, d.login.form.senha).fill(EDUCATOR.senha);
    await field(page, d.login.form.confirmar).fill(EDUCATOR.senha);
    await page.getByRole("button", { name: d.login.form.criarConta }).click();

    await expect(page).toHaveURL(/\/pt-BR\/mestre\/dashboard/);
    await expect(page.getByText(d.educador.nenhumaSessao)).toBeVisible();
  });

  test("signing up twice with the same email is rejected", async () => {
    const res = await educator.page.request.post("/api/auth/register", {
      data: { ...EDUCATOR, email: EDUCATOR.email.toUpperCase() },
    });
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: "EMAIL_TAKEN" });
  });

  test("a wrong password is rejected and the right one logs in", async () => {
    const { page } = educator;
    await page.request.post("/api/auth/logout");
    await page.goto("/pt-BR");

    await field(page, d.login.form.email).fill(EDUCATOR.email);
    await field(page, d.login.form.senha).fill("not-the-password");
    await page.getByRole("button", { name: d.login.form.enter }).click();
    await expect(toast(page)).toHaveText(d.common.errors.INVALID_CREDENTIALS);

    await field(page, d.login.form.senha).fill(EDUCATOR.senha);
    await page.getByRole("button", { name: d.login.form.enter }).click();
    await expect(page).toHaveURL(/\/pt-BR\/mestre\/dashboard/);
  });

  test("the educator creates a session and sees its code", async () => {
    const { page } = educator;
    await page.getByText(d.educador.sidebar.novaSessao).first().click();
    const dialog = page.getByRole("dialog");
    await field(dialog.page(), d.educador.modalSessao.tituloLabel).fill(
      SESSION_TITLE,
    );
    // 3 per team, so the team-full rule can be checked with a few players.
    await field(
      dialog.page(),
      d.educador.modalSessao.integrantesLabel,
    ).selectOption("3");

    const created = page.waitForResponse(
      (r) => r.url().endsWith("/api/events") && r.request().method() === "POST",
    );
    await dialog
      .getByRole("button", { name: d.educador.modalSessao.criar })
      .click();
    const { event } = await json<{
      event: { id: string; code: string; status: string };
    }>(await created);
    state.eventId = event.id;
    state.eventCode = event.code;

    expect(event.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(event.status).toBe("DRAFT");
    await expect(toast(page)).toContainText(event.code);
    await expect(page.locator(".m-val", { hasText: event.code })).toBeVisible();
    await expect(page.getByText(SESSION_TITLE).first()).toBeVisible();
  });

  test("a player enters the event code and creates a team", async () => {
    const { page } = ana;
    await page.goto("/pt-BR");
    await tab(page, d.login.tabs.codigo).click();
    await field(page, d.login.form.seuNome).fill("E2E Ana");
    // Lower case on purpose: the code is normalized.
    await field(page, d.login.form.codigoSessao).fill(
      state.eventCode.toLowerCase(),
    );
    await page.getByRole("button", { name: d.login.form.entrarJogo }).click();

    await expect(
      page.getByRole("heading", { name: d.team.chooseAction }),
    ).toBeVisible();
    await page.getByRole("link", { name: d.team.createTeam }).click();
    await field(page, d.team.createNameLabel).fill(TEAM_NAME);
    await page.getByRole("button", { name: d.team.createTeam }).click();

    await expect(page.getByText(d.team.youAreLeader)).toBeVisible();
    state.joinUrl = await page.locator(".field input[readonly]").inputValue();
    state.joinCode = new URL(state.joinUrl).searchParams.get("code")!;
    expect(state.joinCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    await page.getByRole("button", { name: d.team.enterBoardPreview }).click();
    await expect(page).toHaveURL(/\/pt-BR\/jogador\/dashboard/);
    await expect(page.getByText(TEAM_NAME).first()).toBeVisible();
  });

  test("the public team list never exposes the team's join code", async () => {
    const res = await json<{
      teams: Record<string, unknown>[];
      joinsEnabled: boolean;
    }>(await bruno.page.request.get(`/api/teams?eventCode=${state.eventCode}`));
    expect(res.teams).toEqual([
      { name: TEAM_NAME, memberCount: 1, maxTeamSize: 3 },
    ]);
    expect(JSON.stringify(res)).not.toContain(state.joinCode);
  });

  test("another team cannot take the same name, whatever the case", async () => {
    const res = await bruno.page.request.post("/api/teams", {
      data: {
        eventCode: state.eventCode,
        name: TEAM_NAME.toLowerCase(),
        nickname: "E2E Intruso",
      },
    });
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: "TEAM_NAME_TAKEN" });
  });

  test("a second player joins through the invite link", async () => {
    const { page } = bruno;
    await page.goto(state.joinUrl);
    await expect(field(page, d.team.joinCodeLabel)).toHaveValue(state.joinCode);
    await field(page, d.team.joinNicknameLabel).fill("E2E Bruno");
    await page.getByRole("button", { name: d.team.joinTeam }).click();
    await expect(page).toHaveURL(/\/jogador\/dashboard/);
    await expect(page.getByText(TEAM_NAME).first()).toBeVisible();
  });

  test("the invite link opens in the language of whoever receives it", async ({
    browser,
  }) => {
    // The link has no locale (/team/join?code=…), so it follows the
    // receiver's browser language, not the leader's.
    const context = await browser.newContext({
      baseURL: test.info().project.use.baseURL!,
      locale: "es-ES",
    });
    extra.push(context);
    const page = await context.newPage();
    await page.goto(state.joinUrl);
    await expect(page).toHaveURL(/\/es\/team\/join\?code=/);
  });

  test("a wrong team code shows a translated error", async ({ browser }) => {
    const page = await stranger(browser, "E2E Perdido", "ZZZZZZ");
    await expect(toast(page)).toHaveText(d.common.errors.TEAM_NOT_FOUND);
    await expect(page).toHaveURL(/\/team\/join/);
  });

  test("the educator sees the team and its two members", async () => {
    const { page } = educator;
    await reloadEducatorPanel(page);
    await expect(page.getByText(TEAM_NAME).first()).toBeVisible();
    const participants = page.locator(".m-lbl", {
      hasText: d.educador.metrics.participantes,
    });
    await expect(participants.locator("..").locator(".m-val")).toHaveText("2");
  });

  test("players cannot answer before the session starts", async () => {
    const { page } = ana;
    await page.reload();
    await phaseCell(page, "problema", 1).click();
    await expect(toast(page)).toHaveText(d.jogador.estado.draft);
  });

  test("the educator starts the session", async () => {
    const { page } = educator;
    await page
      .getByRole("button", { name: `▶ ${d.educador.acao.iniciar}` })
      .click();
    await expect(page.getByText(`⬤ ${d.educador.status.ativa}`)).toBeVisible();
  });

  test("answering phase 1 unlocks phase 2", async () => {
    const { page } = ana;
    await page.reload();
    await phaseCell(page, "problema", 1).click();
    await field(page, d.jogador.fase.label).fill(PHASE_1_ANSWER);
    await page.getByRole("button", { name: d.jogador.fase.concluir }).click();
    await page
      .getByRole("button", { name: d.jogador.congrats.continuar })
      .click();

    await expect(phaseCell(page, "problema", 1)).toHaveClass(/\bdone\b/);
    await expect(phaseCell(page, "problema", 2)).toHaveClass(/\bactive\b/);
    const b = await board(page);
    expect(b.keys.problema!.phases["1"]!.status).toBe("concluida");
    expect(b.keys.problema!.phases["2"]!.status).toBe("disponivel");
    expect(b.keys.solucao!.status).toBe("bloqueada");
  });

  test("a phase that is still locked cannot be answered", async () => {
    const res = await ana.page.request.put("/api/board/keys/solucao/phases/1", {
      data: { conteudo: "E2E fora de ordem" },
    });
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: "KEY_LOCKED" });
  });

  test("a team message reaches the other member", async () => {
    // KNOWN BUG (intermittent): the realtime "messages" signal can arrive in
    // under a second, but GET /api/messages hides messages younger than 1 s,
    // so the receiver's refetch comes back empty and the message only shows
    // at the next 60 s fallback poll. This test checks the message arrives
    // and records how long it took; tighten the timeout once fixed.
    test.setTimeout(120_000);
    const text = `E2E olá equipe ${RUN}`;
    const input = ana.page.getByPlaceholder(d.jogador.comm.placeholderEquipe);
    await input.fill(text);
    const sentAt = Date.now();
    await input.press("Enter");
    await expect(ana.page.getByText(text)).toBeVisible();
    await expect(bruno.page.getByText(text)).toBeVisible({ timeout: 70_000 });
    const seconds = (Date.now() - sentAt) / 1000;
    test.info().annotations.push({
      type: "chat delay",
      description: `${seconds.toFixed(1)} s until the teammate saw the message`,
    });
  });

  test("the player picks a role-play role", async () => {
    const { page } = ana;
    await page.getByText(d.jogador.rpg.escolherTitulo).first().click();
    await page.getByRole("dialog").getByRole("button").first().click();
    await expect
      .poll(async () => (await board(page)).me.rpgRole)
      .not.toBeNull();
  });

  test("an announcement from the educator reaches the players", async () => {
    const text = `E2E aviso geral ${RUN}`;
    await educator.page
      .getByPlaceholder(d.educador.avisos.placeholder)
      .fill(text);
    await educator.page
      .getByRole("button", { name: d.educador.avisos.enviar, exact: true })
      .click();
    await expect(educator.page.getByText(text)).toBeVisible();

    await ana.page.reload();
    await ana.page
      .getByRole("button", { name: `🔔 ${d.jogador.avisos.titulo}` })
      .click();
    await expect(ana.page.getByRole("dialog").getByText(text)).toBeVisible();
    await ana.page.keyboard.press("Escape");
  });

  test("a challenge card from the educator shows on the board", async () => {
    const { page } = educator;
    await page
      .getByRole("button", { name: d.educador.carta.launcherSub.problema })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: `🃏 ${d.educador.carta.enviar}` })
      .click();
    await expect(page.getByText(`🃏 ${d.educador.carta.ativa}`)).toBeVisible();

    await ana.page.reload();
    await expect(
      ana.page.getByText(`🃏 ${d.jogador.cartaAtiva.titulo}`),
    ).toBeVisible();
    await expect(
      ana.page.getByText(d.educador.carta.prompts.problema),
    ).toBeVisible();
  });

  test("the activity timer reaches the players and can be stopped", async () => {
    const { page } = educator;
    // The session controls are clickable <div>s (.ctrl-btn), so the only
    // real "▶ Iniciar" button is the timer's.
    await page
      .getByRole("button", {
        name: `▶ ${d.educador.timer.iniciar}`,
        exact: true,
      })
      .click();
    await expect
      .poll(async () => (await board(ana.page)).event.activityTimer)
      .not.toBeNull();

    await page
      .getByRole("button", { name: `⏹ ${d.educador.timer.parar}` })
      .click();
    await expect
      .poll(async () => (await board(ana.page)).event.activityTimer)
      .toBeNull();
  });

  test("turning the chat off blocks messages; turning it on restores them", async () => {
    await toggle(educator.page, d.educador.interruptores.chat).click();
    await expect
      .poll(async () => (await board(ana.page)).event.switches.chat)
      .toBe(false);

    await ana.page.reload();
    await expect(
      ana.page.getByPlaceholder(d.jogador.comm.placeholderEquipe),
    ).toBeDisabled();
    const res = await ana.page.request.post("/api/messages", {
      data: {
        type: "TEAM",
        text: "E2E bloqueado",
        clientId: `e2e-${RUN}-blocked`,
      },
    });
    expect(await res.json()).toEqual({ error: "CHAT_DISABLED" });

    await toggle(educator.page, d.educador.interruptores.chat).click();
    await expect
      .poll(async () => (await board(ana.page)).event.switches.chat)
      .toBe(true);
  });

  test("closing new entries blocks newcomers but not returning players", async ({
    browser,
  }) => {
    await toggle(educator.page, d.educador.interruptores.joins).click();
    await expect
      .poll(async () => (await board(ana.page)).event.switches.joins)
      .toBe(false);

    const newcomer = await stranger(browser, "E2E Atrasado", state.joinCode);
    await expect(toast(newcomer)).toHaveText(d.common.errors.JOINS_DISABLED);

    // Same nickname, any case: recovers the seat even with entries closed.
    const back = await bruno.page.request.post("/api/participants", {
      data: { teamJoinCode: state.joinCode, nickname: "e2e bruno" },
    });
    expect(back.status()).toBe(200);
    expect(await back.json()).toMatchObject({ recovered: true });

    await toggle(educator.page, d.educador.interruptores.joins).click();
    await expect
      .poll(async () => (await board(ana.page)).event.switches.joins)
      .toBe(true);
  });

  test("a team cannot go over its size limit", async ({ browser }) => {
    const third = await stranger(browser, "E2E Carla", state.joinCode);
    await expect(third).toHaveURL(/\/jogador\/dashboard/);

    const fourth = await stranger(browser, "E2E Diego", state.joinCode);
    await expect(toast(fourth)).toHaveText(d.common.errors.TEAM_FULL);
  });

  test("pausing blocks answering and resuming allows it again", async () => {
    await educator.page
      .locator(".ctrl-btn", { hasText: d.educador.right.pausar })
      .click();
    await expect(
      educator.page.getByText(`⬤ ${d.educador.status.pausada}`),
    ).toBeVisible();

    await ana.page.reload();
    await phaseCell(ana.page, "problema", 2).click();
    await expect(toast(ana.page)).toHaveText(d.jogador.estado.paused);

    await educator.page
      .locator(".ctrl-btn", { hasText: d.educador.right.retomar })
      .click();
    await expect(
      educator.page.getByText(`⬤ ${d.educador.status.ativa}`),
    ).toBeVisible();
  });

  test("the team delivers a deploy link", async () => {
    const { page } = ana;
    await page.reload();
    await page.getByRole("button", { name: d.jogador.entregaAbrir }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: d.submission.deployLink }).click();

    // A plain http:// link is flagged under the field when trying to save,
    // and nothing is saved.
    await field(page, d.submission.urlLabel).fill("http://sem-https.example");
    await dialog.getByRole("button", { name: d.submission.submit }).click();
    await expect(dialog.getByText(d.submission.invalidUrl)).toBeVisible();
    expect((await board(page)).submission).toBeNull();

    await field(page, d.submission.urlLabel).fill(
      "https://e2e-projeto.example.com",
    );
    await dialog.getByRole("button", { name: d.submission.submit }).click();
    await expect(
      page.getByRole("button", { name: d.jogador.entregaEditar }),
    ).toBeVisible();

    const b = await board(page);
    expect(b.submission).toMatchObject({
      type: "DEPLOY_LINK",
      url: expect.stringContaining("e2e-projeto.example.com"),
    });
  });

  test("the saved-delivery message is up to date", async () => {
    // KNOWN BUG: submission.saved still says the delivery was only saved
    // locally and the backend is missing, although it is saved for real.
    test.fail(true, "Stale 'saved locally' toast");
    expect(d.submission.saved).not.toMatch(/localmente|backend/i);
  });

  test("the team uploads a PDF and the educator can download it", async () => {
    const { page } = ana;
    await page.getByRole("button", { name: d.jogador.entregaEditar }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: d.submission.fileOrImage })
      .click();
    await dialog.locator("input[type=file]").setInputFiles({
      name: `E2E-${RUN}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
    });
    await expect(toast(page)).toHaveText(d.submission.arquivoEnviado, {
      timeout: 20_000,
    });
    await expect(dialog.getByText(`E2E-${RUN}.pdf`)).toBeVisible();
    await dialog.getByRole("button", { name: d.submission.submit }).click();

    const { files } = await board(page);
    expect(files).toHaveLength(1);
    const download = await educator.page.request.get(files[0]!.downloadUrl, {
      maxRedirects: 0,
    });
    expect(download.status()).toBe(307);
    expect(download.headers().location).toContain("/storage/v1/");
  });

  test("a renamed non-PDF file is rejected by its content", async () => {
    const res = await json<{ file: { id: string }; uploadUrl: string }>(
      await ana.page.request.post("/api/submissions/files", {
        data: {
          fileName: `E2E-${RUN}-fake.pdf`,
          contentType: "application/pdf",
          size: 30,
        },
      }),
    );
    await ana.page.request.put(res.uploadUrl, {
      headers: { "content-type": "application/pdf" },
      data: Buffer.from("<html><script>alert(1)</script>"),
    });
    const confirm = await ana.page.request.post(
      `/api/submissions/files/${res.file.id}/confirm`,
    );
    expect(confirm.status()).toBe(400);
    expect(await confirm.json()).toEqual({ error: "FILE_TYPE_NOT_ALLOWED" });
  });

  test("the educator sees the delivery on the team card", async () => {
    await reloadEducatorPanel(educator.page);
    await expect(
      educator.page.getByText(`✓ ${d.educador.equipeCard.entregou}`),
    ).toBeVisible();
  });

  test("the educator creates a mentor code and a mentor logs in with it", async () => {
    await educator.page
      .getByRole("button", { name: d.educador.mentores.gerar })
      .click();
    const code = educator.page
      .locator("strong")
      .filter({ hasText: /^[A-HJ-NP-Z2-9]{6}$/ });
    await expect(code).toBeVisible();
    state.mentorCode = (await code.textContent())!;

    const { page } = mentor;
    await page.goto("/pt-BR");
    await tab(page, d.login.tabs.mentor).click();
    await field(page, d.login.form.seuNome).fill("E2E Mentora");
    await field(page, d.login.form.codigoMentores).fill(state.mentorCode);
    await page.getByRole("button", { name: d.login.form.entrarMentor }).click();
    await expect(page).toHaveURL(/\/pt-BR\/mentor\/dashboard/);
    await expect(page.getByText(TEAM_NAME)).toBeVisible();
  });

  test("the mentor grades the team and the educator sees the grade", async () => {
    const { page } = mentor;
    await page
      .getByRole("button", { name: d.mentor.avaliar.calificar })
      .click();
    const sliders = page.locator("input[type=range]");
    await expect(sliders).toHaveCount(5);
    for (let i = 0; i < 5; i++) await sliders.nth(i).fill("5");
    await field(page, d.mentor.avaliar.comentario).fill(
      `E2E comentário ${RUN}`,
    );
    await page.getByRole("button", { name: d.mentor.avaliar.salvar }).click();
    await expect(toast(page)).toHaveText(d.mentor.avaliar.salvo);
    await expect(
      page.getByRole("button", { name: d.mentor.avaliar.editar }),
    ).toBeVisible();

    await educator.page.getByText(d.educador.sidebar.mentores).click();
    const dialog = educator.page.getByRole("dialog");
    // One mentor, and the team's average of all 5s from that one mentor.
    await expect(
      dialog.getByText(
        d.educador.mentores.mentoresCount.replace("{count}", "1"),
      ),
    ).toBeVisible();
    const row = dialog.locator("div", { hasText: TEAM_NAME }).last();
    await expect(row).toContainText("5.0 (1)");
    await educator.page.keyboard.press("Escape");
  });

  test("the three CSV exports download with the team's data", async () => {
    const base = `/api/events/${state.eventId}/export`;
    for (const [type, mustContain] of [
      ["report", TEAM_NAME],
      ["proposals", PHASE_1_ANSWER],
      ["activity", "EVENT_STATUS_CHANGED"],
    ] as const) {
      const res = await educator.page.request.get(`${base}?type=${type}`);
      expect(res.status(), type).toBe(200);
      expect(res.headers()["content-type"], type).toContain("text/csv");
      expect(await res.text(), type).toContain(mustContain);
    }
  });

  test("the educator can finish the session from the panel", async () => {
    // KNOWN GAP: the API supports FINISHED, but neither the educator panel
    // nor the mural has a button to end the session.
    test.fail(true, "No 'finish session' button");
    await expect(
      educator.page.getByRole("button", {
        name: /encerrar|finalizar|terminar/i,
      }),
    ).toBeVisible({ timeout: 2_000 });
  });

  test("after the session ends, players can no longer answer", async () => {
    await json(
      await educator.page.request.patch(`/api/events/${state.eventId}/status`, {
        data: { status: "FINISHED" },
      }),
    );
    await ana.page.reload();
    await phaseCell(ana.page, "problema", 2).click();
    await expect(toast(ana.page)).toHaveText(d.jogador.estado.finished);
  });

  test("'Sair' really logs the educator out", async () => {
    // KNOWN BUG: the panel's "Sair" only navigates to "/" and never calls
    // /api/auth/logout, so on a shared computer the next person can reopen
    // the educator panel.
    test.fail(true, "'Sair' keeps the educator session");
    const { page } = educator;
    await page.getByRole("button", { name: d.educador.sair }).first().click();
    await expect(page).toHaveURL(/\/pt-BR\/?$/);
    await page.goto("/pt-BR/mestre/dashboard");
    await expect(page).toHaveURL(/\/pt-BR\/?$/, { timeout: 5_000 });
  });
});
