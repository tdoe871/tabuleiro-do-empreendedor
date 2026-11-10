// Load test: simulates the event (60 teams, 300 participants by default)
// against a running app and reports latency and errors per endpoint.
//
//   pnpm load-test                                   # against http://localhost:3000
//   pnpm load-test -- --base https://<deploy> --duration 300
//   pnpm load-test -- --teams 10 --members 3 --duration 60
//
// It creates its own staff account and ACTIVE event directly in the
// database (DATABASE_URL), joins the teams through the API like real
// players, runs the simulation and deletes everything at the end (event,
// teams, participants, messages). Use --keep to leave the data.
//
// Each simulated participant, like a browser without realtime (worst case):
// - GET /api/messages?after=<cursor> every --messages-every seconds (5)
// - GET /api/board every --board-every seconds (15)
// - sends a chat message about once a minute
// The team leader completes the next phase every 60-120 s. One educator
// polls the overview every 10 s. Intervals get ±30% jitter.
//
// Note: the app limits team creation and joins to 300 per 5 min per IP;
// more than 300 participants from one machine will hit RATE_LIMITED.

import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Env from apps/web/.env (if present) before the database client loads.
const ENV_FILE = resolve(__dirname, "../../../apps/web/.env");
if (!process.env.DATABASE_URL && existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

type Db = typeof import("../src");
let db: Db;

type Options = {
  base: string;
  teams: number;
  members: number;
  duration: number;
  messagesEvery: number;
  boardEvery: number;
  keep: boolean;
};

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    base: "http://localhost:3000",
    teams: 60,
    members: 5,
    duration: 120,
    messagesEvery: 5,
    boardEvery: 15,
    keep: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i] ?? "";
    if (arg === "--base") opts.base = next().replace(/\/$/, "");
    else if (arg === "--teams") opts.teams = Number(next());
    else if (arg === "--members") opts.members = Number(next());
    else if (arg === "--duration") opts.duration = Number(next());
    else if (arg === "--messages-every") opts.messagesEvery = Number(next());
    else if (arg === "--board-every") opts.boardEvery = Number(next());
    else if (arg === "--keep") opts.keep = true;
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

type Sample = { ms: number; status: number };
const samples = new Map<string, Sample[]>();

function record(name: string, ms: number, status: number) {
  const list = samples.get(name) ?? [];
  list.push({ ms, status });
  samples.set(name, list);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, index)]!;
}

function report(elapsedSeconds: number) {
  const rows = [...samples.entries()].sort(([a], [b]) => a.localeCompare(b));
  const pad = (v: unknown, n: number) => String(v).padStart(n);
  console.log(
    `\n${"endpoint".padEnd(28)}${pad("req", 7)}${pad("req/s", 7)}${pad("p50", 7)}${pad("p95", 7)}${pad("p99", 7)}${pad("max", 7)}${pad("4xx", 6)}${pad("5xx", 6)}${pad("net", 6)}`,
  );
  let total = 0;
  let failures = 0;
  for (const [name, list] of rows) {
    const ms = list.map((s) => s.ms).sort((a, b) => a - b);
    const c4 = list.filter((s) => s.status >= 400 && s.status < 500).length;
    const c5 = list.filter((s) => s.status >= 500).length;
    const net = list.filter((s) => s.status === 0).length;
    total += list.length;
    failures += c5 + net;
    console.log(
      `${name.padEnd(28)}${pad(list.length, 7)}${pad((list.length / elapsedSeconds).toFixed(1), 7)}${pad(percentile(ms, 50), 7)}${pad(percentile(ms, 95), 7)}${pad(percentile(ms, 99), 7)}${pad(ms.at(-1) ?? 0, 7)}${pad(c4, 6)}${pad(c5, 6)}${pad(net, 6)}`,
    );
  }
  console.log(
    `\nTotal: ${total} requests in ${elapsedSeconds.toFixed(0)} s (${(total / elapsedSeconds).toFixed(1)} req/s), ${failures} server or network errors (${((failures / Math.max(total, 1)) * 100).toFixed(2)}%). Times in ms.`,
  );
  return failures;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

let BASE = "";

async function call(
  name: string,
  method: string,
  path: string,
  cookie?: string,
  body?: unknown,
): Promise<{ status: number; json: any; setCookie: string }> {
  const start = performance.now();
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    record(name, Math.round(performance.now() - start), res.status);
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return {
      status: res.status,
      json,
      setCookie: res.headers.get("set-cookie") ?? "",
    };
  } catch {
    record(name, Math.round(performance.now() - start), 0);
    return { status: 0, json: null, setCookie: "" };
  }
}

const playerCookie = (setCookie: string) =>
  setCookie.match(/tdoe_player=[^;]+/)?.[0];

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (seconds: number) =>
  seconds * 1000 * (0.7 + Math.random() * 0.6);

async function inBatches<T>(
  items: T[],
  size: number,
  run: (item: T) => Promise<void>,
) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(run));
  }
}

type Player = { cookie: string; leader: boolean; cursor: number };

const KEY_ORDER = [
  "problema",
  "solucao",
  "parcerias",
  "oportunidades",
] as const;

async function participantLoop(player: Player, opts: Options, until: number) {
  let nextMessages = Date.now() + Math.random() * opts.messagesEvery * 1000;
  let nextBoard = Date.now() + Math.random() * opts.boardEvery * 1000;
  let nextSend = Date.now() + jitter(60);
  let nextPhase = Date.now() + jitter(90);
  let phase = 0;

  while (Date.now() < until) {
    const now = Date.now();
    if (now >= nextMessages) {
      const res = await call(
        "GET /api/messages",
        "GET",
        `/api/messages?after=${player.cursor}`,
        player.cookie,
      );
      if (typeof res.json?.cursor === "number") player.cursor = res.json.cursor;
      nextMessages = Date.now() + jitter(opts.messagesEvery);
    }
    if (now >= nextBoard) {
      await call("GET /api/board", "GET", "/api/board", player.cookie);
      nextBoard = Date.now() + jitter(opts.boardEvery);
    }
    if (now >= nextSend) {
      await call("POST /api/messages", "POST", "/api/messages", player.cookie, {
        type: "TEAM",
        text: "mensaje de prueba de carga",
        clientId: crypto.randomUUID(),
      });
      nextSend = Date.now() + jitter(60);
    }
    if (player.leader && now >= nextPhase && phase < 12) {
      const key = KEY_ORDER[Math.floor(phase / 3)];
      const order = (phase % 3) + 1;
      const res = await call(
        "PUT phase",
        "PUT",
        `/api/board/keys/${key}/phases/${order}`,
        player.cookie,
        {
          conteudo: "respuesta de prueba de carga",
        },
      );
      if (res.status === 200) phase++;
      nextPhase = Date.now() + jitter(90);
    }
    await sleep(250);
  }
}

async function educatorLoop(cookie: string, eventId: string, until: number) {
  while (Date.now() < until) {
    await call(
      "GET overview",
      "GET",
      `/api/events/${eventId}/overview`,
      cookie,
    );
    await sleep(jitter(10));
  }
}

async function main() {
  db = await import("../src");
  const { BOARD_PHASES, prisma } = db;
  const { createStaffSession } =
    await import("../../../apps/web/src/lib/auth/session");
  const opts = parseArgs(process.argv.slice(2));
  BASE = opts.base;
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) {
    throw new Error("DATABASE_URL and AUTH_SECRET must be set (apps/web/.env)");
  }
  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!health?.ok) throw new Error(`${BASE}/api/health does not answer`);

  const stamp = Date.now().toString(36).toUpperCase();
  const staff = await prisma.staff.create({
    data: {
      email: `load-${stamp.toLowerCase()}@test.local`,
      name: "Prueba de carga",
      hashedPassword: "!",
    },
  });
  const now = Date.now();
  const event = await prisma.event.create({
    data: {
      code: `L${stamp.slice(-5)}`,
      name: `Prueba de carga ${stamp}`,
      hostId: staff.id,
      status: "ACTIVE",
      durationMinutes: 180,
      maxTeams: Math.max(opts.teams, 1),
      startedAt: new Date(now),
      endsAt: new Date(now + 180 * 60_000),
    },
  });
  await prisma.phase.createMany({
    data: BOARD_PHASES.map((p) => ({ ...p, eventId: event.id })),
  });
  const staffCookie = `tdoe_staff=${await createStaffSession(staff.id)}`;
  console.log(
    `Event ${event.code} against ${BASE}: ${opts.teams} teams × ${opts.members} members, ${opts.duration} s`,
  );

  let failures = 0;
  try {
    // 1. Teams and members join through the API, 20 at a time.
    const players: Player[] = [];
    const joinStart = performance.now();
    await inBatches(
      Array.from({ length: opts.teams }, (_, i) => i),
      20,
      async (i) => {
        const team = await call(
          "POST /api/teams",
          "POST",
          "/api/teams",
          undefined,
          {
            eventCode: event.code,
            name: `Equipo ${i + 1}`,
            nickname: `lider${i + 1}`,
          },
        );
        const leader = playerCookie(team.setCookie);
        if (!leader) return;
        players.push({ cookie: leader, leader: true, cursor: 0 });
        await Promise.all(
          Array.from({ length: opts.members - 1 }, async (_, m) => {
            const joined = await call(
              "POST /api/participants",
              "POST",
              "/api/participants",
              undefined,
              {
                teamJoinCode: team.json.team.joinCode,
                nickname: `miembro${m + 1}`,
              },
            );
            const cookie = playerCookie(joined.setCookie);
            if (cookie) players.push({ cookie, leader: false, cursor: 0 });
          }),
        );
      },
    );
    console.log(
      `Joined ${players.length}/${opts.teams * opts.members} participants in ${((performance.now() - joinStart) / 1000).toFixed(1)} s. Simulating...`,
    );

    // 2. Everyone uses the app at the same time.
    const runStart = Date.now();
    const until = runStart + opts.duration * 1000;
    const progress = setInterval(() => {
      const done = [...samples.values()].reduce((n, l) => n + l.length, 0);
      console.log(
        `  ${Math.round((Date.now() - runStart) / 1000)} s, ${done} requests`,
      );
    }, 30_000);
    await Promise.all([
      ...players.map((player) => participantLoop(player, opts, until)),
      educatorLoop(staffCookie, event.id, until),
    ]);
    clearInterval(progress);
    failures = report((Date.now() - runStart) / 1000);

    const messages = await prisma.message.count({
      where: { team: { eventId: event.id } },
    });
    const phases = await prisma.teamPhase.count({
      where: { team: { eventId: event.id } },
    });
    console.log(`Saved: ${messages} messages, ${phases} completed phases.`);
  } finally {
    if (opts.keep) {
      console.log(
        `--keep: event ${event.code} (${event.id}) and its data were left in place.`,
      );
    } else {
      await prisma.event.delete({ where: { id: event.id } });
      await prisma.staff.delete({ where: { id: staff.id } });
      console.log("Cleanup: event, teams, participants and messages deleted.");
    }
  }
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db?.prisma.$disconnect());
