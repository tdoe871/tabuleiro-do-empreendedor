import { BOARD_KEYS, PHASES_PER_KEY, type BoardKey } from "@tdoe/db";

import es from "@/i18n/dictionaries/es.json";
import {
  computeKeyStatuses,
  toKeyId,
  type KeyStatus,
} from "@/features/event/server/progress";
import {
  RUBRIC,
  evaluationAverage,
  readScores,
  summarizeEvaluations,
  type CriterionId,
} from "@/features/mentor/server/rubric";

// The content of the PDF team report, already in Spanish (the organizers'
// language, like the CSV exports) and formatted. Pure: no database or PDF
// code, so it can be unit-tested; pdf.ts draws it.

export const DEFAULT_REPORT_TIME_ZONE = "America/Mexico_City";

export const KEY_LABEL: Record<BoardKey, string> = {
  PROBLEMA: "Problema",
  SOLUCAO: "Solución",
  PARCERIAS: "Alianzas",
  OPORTUNIDADES: "Oportunidades",
};
const STATUS_LABEL: Record<KeyStatus, string> = {
  ativa: "En curso",
  concluida: "Concluida",
  bloqueada: "Bloqueada",
};
const EVENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "En espera",
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  FINISHED: "Finalizada",
};
const MODE_LABEL: Record<string, string> = {
  SCHOOL: "Escolar",
  CUSTOM: "Personalizado",
};
const SUBMISSION_TYPE_LABEL: Record<string, string> = {
  DEPLOY_LINK: "Link del deployment",
  REPO_LINK: "Link del repositorio",
  FILE_OR_IMAGE: "Presentación o imagen",
  NONE: "Sin entrega de código",
};
export const CRITERION_LABEL: Record<CriterionId, string> = {
  problema: "Problema",
  solucao: "Solución",
  impacto: "Impacto",
  viabilidade: "Viabilidad",
  apresentacao: "Presentación",
};

type PhaseText = { nome: string; pergunta: string };
const PHASE_TEXT = es.jogador.fases as Record<string, PhaseText[]>;
const RPG_ROLE = es.rpgPapeis as Record<string, { nome: string }>;

// ---------------------------------------------------------------------------
// Input: what the route reads from the database.
// ---------------------------------------------------------------------------

export type ReportTeamInput = {
  id: string;
  name: string;
  createdAt: Date;
  score: number;
  participants: {
    nickname: string;
    role: string;
    rpgRole: string | null;
    joinedAt: Date;
  }[];
  phaseProgress: {
    content: string | null;
    completedAt: Date | null;
    completedBy: { nickname: string } | null;
    phase: { key: BoardKey; order: number };
  }[];
  submission: {
    type: string;
    url: string | null;
    links: string[];
    description: string | null;
    submittedAt: Date | null;
  } | null;
  files: { fileName: string; size: number }[];
  evaluations: {
    scores: unknown;
    comment: string | null;
    updatedAt: Date;
    mentor: { name: string };
  }[];
};

export type ReportInput = {
  event: {
    name: string;
    code: string;
    mode: string;
    scenario: string | null;
    status: string;
    startedAt: Date | null;
    endsAt: Date | null;
    maxTeamSize: number;
  };
  hostName: string;
  // Every team of the event (for the ranking and "team n of N").
  allTeams: ReportTeamInput[];
  // null: the whole event in one PDF; an id: only that team.
  onlyTeamId: string | null;
  generatedAt: Date;
  timeZone: string;
};

// ---------------------------------------------------------------------------
// Output: what pdf.ts draws.
// ---------------------------------------------------------------------------

export type Row = [string, string];
export type LinkItem = { label: string; url: string };

export type TeamSection = {
  name: string;
  position: number; // in the ranking
  index: number; // creation order, 1-based
  total: number;
  general: Row[];
  members: string[][]; // Nombre, Rol, Rol en el juego, Se unió
  keys: { key: BoardKey; label: string; status: string; done: string }[];
  proposal: {
    key: BoardKey;
    label: string;
    phases: {
      title: string;
      question: string;
      answer: string | null;
      meta: string;
    }[];
  }[];
  delivery: {
    delivered: boolean;
    rows: Row[];
    links: LinkItem[];
    description: string | null;
    files: string[];
  };
  evaluation: {
    count: number;
    average: string;
    byCriterion: string[][]; // Criterio, Promedio
    detail: string[][]; // Juez, 5 criterios, Promedio
    comments: { mentor: string; when: string; text: string }[];
  };
};

export type Report = {
  title: string;
  subtitle: string;
  fileName: string;
  eventName: string;
  generatedAt: string;
  eventInfo: Row[];
  scenario: string | null;
  stats: { label: string; value: string }[] | null;
  ranking: string[][] | null; // only for the whole-event PDF
  teams: TeamSection[];
};

export const RANKING_HEADER = [
  "#",
  "Equipo",
  "Integrantes",
  "Fases",
  "Claves",
  "Puntos",
  "Entrega",
  "Calif.",
  "Promedio",
];
export const MEMBERS_HEADER = ["Nombre", "Rol", "Rol en el juego", "Se unió"];
export const DETAIL_HEADER = [
  "Juez",
  ...RUBRIC.map((id) => CRITERION_LABEL[id]),
  "Promedio",
];

const TOTAL_PHASES = BOARD_KEYS.length * PHASES_PER_KEY;

export function resolveTimeZone(value: string | null | undefined): string {
  if (!value) return DEFAULT_REPORT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("es-MX", { timeZone: value });
    return value;
  } catch {
    return DEFAULT_REPORT_TIME_ZONE;
  }
}

function dateFormatter(timeZone: string) {
  const format = new Intl.DateTimeFormat("es-MX", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return (date: Date | null | undefined) =>
    date ? format.format(date).replace(/\./g, "") : "—";
}

function score(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(2);
}

function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Safe for a file name: ASCII letters, digits and dashes.
export function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 50) || "equipo"
  );
}

type Ranked = {
  team: ReportTeamInput;
  average: number | null;
  phases: number;
  keysDone: number;
};

// Best first: mentors' average (ungraded last), then phases completed, then
// points, then name.
export function rankTeams(teams: ReportTeamInput[]): Ranked[] {
  return teams
    .map((team) => {
      const statuses = computeKeyStatuses(
        team.phaseProgress.filter((p) => p.completedAt).map((p) => p.phase),
      );
      return {
        team,
        average: summarizeEvaluations(team.evaluations).average,
        phases: team.phaseProgress.filter((p) => p.completedAt).length,
        keysDone: Object.values(statuses).filter((s) => s === "concluida")
          .length,
      };
    })
    .sort(
      (a, b) =>
        (b.average ?? -1) - (a.average ?? -1) ||
        b.phases - a.phases ||
        b.team.score - a.team.score ||
        a.team.name.localeCompare(b.team.name, "es"),
    );
}

function teamSection(
  team: ReportTeamInput,
  position: number,
  index: number,
  total: number,
  maxTeamSize: number,
  when: (d: Date | null | undefined) => string,
): TeamSection {
  const completed = team.phaseProgress.filter((p) => p.completedAt);
  const statuses = computeKeyStatuses(completed.map((p) => p.phase));
  const leader = team.participants.find((p) => p.role === "LEADER");
  const last = completed
    .map((p) => p.completedAt!)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const byPhase = new Map(
    completed.map((p) => [`${p.phase.key}:${p.phase.order}`, p]),
  );

  const summary = summarizeEvaluations(team.evaluations);
  const delivered = team.submission?.submittedAt ? team.submission : null;
  const links: LinkItem[] = [];
  if (delivered?.url)
    links.push({ label: "Link principal", url: delivered.url });
  for (const [i, url] of (delivered?.links ?? []).entries()) {
    links.push({ label: `Link extra ${i + 1}`, url });
  }

  const sortedEvaluations = [...team.evaluations].sort((a, b) =>
    a.mentor.name.localeCompare(b.mentor.name, "es"),
  );

  return {
    name: team.name,
    position,
    index,
    total,
    general: [
      ["Líder", leader?.nickname ?? "—"],
      ["Integrantes", `${team.participants.length} de ${maxTeamSize}`],
      ["Fases concluidas", `${completed.length} de ${TOTAL_PHASES}`],
      [
        "Claves concluidas",
        `${Object.values(statuses).filter((s) => s === "concluida").length} de ${BOARD_KEYS.length}`,
      ],
      ["Puntos de investigación", String(team.score)],
      [
        "Promedio de los jueces",
        summary.average === null
          ? "Sin calificaciones"
          : `${score(summary.average)} / 5 (${summary.count} ${summary.count === 1 ? "calificación" : "calificaciones"})`,
      ],
      ["Equipo creado", when(team.createdAt)],
      ["Última fase concluida", when(last)],
    ],
    members: team.participants.map((p) => [
      p.nickname,
      p.role === "LEADER" ? "Líder" : "Integrante",
      (p.rpgRole && RPG_ROLE[p.rpgRole]?.nome) || "—",
      when(p.joinedAt),
    ]),
    keys: BOARD_KEYS.map((key) => ({
      key,
      label: KEY_LABEL[key],
      status: STATUS_LABEL[statuses[toKeyId(key)]],
      done: `${completed.filter((p) => p.phase.key === key).length} de ${PHASES_PER_KEY}`,
    })),
    proposal: BOARD_KEYS.map((key) => ({
      key,
      label: KEY_LABEL[key],
      phases: Array.from({ length: PHASES_PER_KEY }, (_, i) => {
        const order = i + 1;
        const text = PHASE_TEXT[toKeyId(key)]?.[i];
        const answer = byPhase.get(`${key}:${order}`);
        return {
          title: `Fase ${order} · ${text?.nome ?? ""}`.replace(/ · $/, ""),
          question: text?.pergunta ?? "",
          answer: answer?.content?.trim() || null,
          meta: answer
            ? `Completada por ${answer.completedBy?.nickname ?? "—"} · ${when(answer.completedAt)}`
            : "",
        };
      }),
    })),
    delivery: {
      delivered: Boolean(delivered),
      rows: delivered
        ? [
            [
              "Tipo de entrega",
              SUBMISSION_TYPE_LABEL[delivered.type] ?? delivered.type,
            ],
            ["Entregado", when(delivered.submittedAt)],
          ]
        : [],
      links,
      description: delivered?.description?.trim() || null,
      files: team.files.map((f) => `${f.fileName} (${fileSize(f.size)})`),
    },
    evaluation: {
      count: summary.count,
      average: score(summary.average),
      byCriterion: RUBRIC.map((id) => [
        CRITERION_LABEL[id],
        score(summary.byCriterion[id]),
      ]),
      detail: sortedEvaluations.map((e) => {
        const s = readScores(e.scores);
        return [
          e.mentor.name,
          ...RUBRIC.map((id) => (s[id] === undefined ? "—" : String(s[id]))),
          score(evaluationAverage(s)),
        ];
      }),
      comments: sortedEvaluations
        .filter((e) => e.comment?.trim())
        .map((e) => ({
          mentor: e.mentor.name,
          when: when(e.updatedAt),
          text: e.comment!.trim(),
        })),
    },
  };
}

export function buildReport(input: ReportInput): Report {
  const when = dateFormatter(input.timeZone);
  const { event } = input;
  const ranked = rankTeams(input.allTeams);
  const position = new Map(ranked.map((r, i) => [r.team.id, i + 1]));
  const byCreation = [...input.allTeams].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const index = new Map(byCreation.map((t, i) => [t.id, i + 1]));
  const selected = input.onlyTeamId
    ? input.allTeams.filter((t) => t.id === input.onlyTeamId)
    : // Whole event: teams in ranking order.
      ranked.map((r) => r.team);
  const total = input.allTeams.length;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: input.timeZone,
  }).format(input.generatedAt);

  const single = input.onlyTeamId ? selected[0] : null;
  const participants = input.allTeams.reduce(
    (sum, t) => sum + t.participants.length,
    0,
  );

  return {
    title: single ? "Reporte del equipo" : "Reporte de equipos",
    subtitle: single ? single.name : `${total} equipos`,
    fileName: single
      ? `tdoe-${event.code}-equipo-${slug(single.name)}-${date}.pdf`
      : `tdoe-${event.code}-reporte-equipos-${date}.pdf`,
    eventName: event.name,
    generatedAt: when(input.generatedAt),
    eventInfo: [
      ["Evento", event.name],
      ["Código", event.code],
      ["Modo", MODE_LABEL[event.mode] ?? event.mode],
      ["Estado", EVENT_STATUS_LABEL[event.status] ?? event.status],
      ["Inicio", when(event.startedAt)],
      ["Fin", when(event.endsAt)],
      ["Organizador", input.hostName],
      ["Generado", `${when(input.generatedAt)} (${input.timeZone})`],
    ],
    scenario: event.mode === "CUSTOM" ? event.scenario?.trim() || null : null,
    stats: single
      ? null
      : [
          { label: "Equipos", value: String(total) },
          { label: "Participantes", value: String(participants) },
          {
            label: "Entregas",
            value: String(
              input.allTeams.filter((t) => t.submission?.submittedAt).length,
            ),
          },
          {
            label: "Calificaciones",
            value: String(
              input.allTeams.reduce((s, t) => s + t.evaluations.length, 0),
            ),
          },
        ],
    ranking: single
      ? null
      : ranked.map((r, i) => [
          String(i + 1),
          r.team.name,
          String(r.team.participants.length),
          `${r.phases}/${TOTAL_PHASES}`,
          `${r.keysDone}/${BOARD_KEYS.length}`,
          String(r.team.score),
          r.team.submission?.submittedAt ? "Sí" : "No",
          String(r.team.evaluations.length),
          score(r.average),
        ]),
    teams: selected.map((team) =>
      teamSection(
        team,
        position.get(team.id) ?? 0,
        index.get(team.id) ?? 0,
        total,
        event.maxTeamSize,
        when,
      ),
    ),
  };
}
