/**
 * @jest-environment node
 */
import { writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

import {
  buildReport,
  rankTeams,
  resolveTimeZone,
  slug,
  type ReportInput,
  type ReportTeamInput,
} from "@/features/report/server/model";
import { renderReportPdf } from "@/features/report/server/pdf";

import es from "@/i18n/dictionaries/es.json";

// The PDF team report: content (model.ts) and drawing (pdf.ts).
const RPG_PESQUISADOR = es.rpgPapeis.pesquisador.nome;

const SCORES = (n: number) => ({
  problema: n,
  solucao: n,
  impacto: n,
  viabilidade: n,
  apresentacao: n,
});
const at = (iso: string) => new Date(iso);

function team(
  id: string,
  name: string,
  over: Partial<ReportTeamInput> = {},
): ReportTeamInput {
  return {
    id,
    name,
    createdAt: at("2026-11-12T15:00:00Z"),
    score: 0,
    participants: [],
    phaseProgress: [],
    submission: null,
    files: [],
    evaluations: [],
    ...over,
  };
}

const alfa = team("t1", "Los Innovadores 🚀 Ñandú", {
  createdAt: at("2026-11-12T15:05:00Z"),
  score: 60,
  participants: [
    {
      nickname: "Ana",
      role: "LEADER",
      rpgRole: "pesquisador",
      joinedAt: at("2026-11-12T15:05:00Z"),
    },
    {
      nickname: "José",
      role: "MEMBER",
      rpgRole: null,
      joinedAt: at("2026-11-12T15:10:00Z"),
    },
  ],
  phaseProgress: [1, 2, 3].map((order) => ({
    content:
      order === 2
        ? "Respuesta larga 💡 ".repeat(80) +
          "\nSegunda línea con acentos: áéíóú ñ ç ã õ « » “ ” — fin."
        : `Respuesta de la fase ${order} del problema`,
    completedAt: at(`2026-11-12T1${order + 5}:00:00Z`),
    completedBy: { nickname: order === 1 ? "Ana" : "José" },
    phase: { key: "PROBLEMA" as const, order },
  })),
  submission: {
    type: "FILE_OR_IMAGE",
    url: "https://los-innovadores.vercel.app",
    links: [
      "https://github.com/ejemplo/un-repositorio-con-un-nombre-muy-largo-para-probar-el-corte-de-links/tree/main/apps",
    ],
    description:
      "Plataforma para conectar productores locales 🌱 con escuelas.",
    submittedAt: at("2026-11-13T15:30:00Z"),
  },
  files: [
    { fileName: "Pitch final.pptx", size: 3_400_000 },
    { fileName: "Resumen.pdf", size: 420_000 },
  ],
  evaluations: [
    {
      scores: SCORES(5),
      comment: "Excelente propuesta 👏",
      updatedAt: at("2026-11-13T17:00:00Z"),
      mentor: { name: "Dra. Pérez" },
    },
    {
      scores: { ...SCORES(4), impacto: 3 },
      comment: null,
      updatedAt: at("2026-11-13T17:30:00Z"),
      mentor: { name: "Ing. Gómez" },
    },
  ],
});
const beta = team("t2", "Equipo Beta", {
  createdAt: at("2026-11-12T15:01:00Z"),
  score: 20,
  participants: [
    {
      nickname: "Beto",
      role: "LEADER",
      rpgRole: null,
      joinedAt: at("2026-11-12T15:01:00Z"),
    },
  ],
  phaseProgress: [
    {
      content: "Algo",
      completedAt: at("2026-11-12T16:00:00Z"),
      completedBy: { nickname: "Beto" },
      phase: { key: "PROBLEMA", order: 1 },
    },
  ],
  evaluations: [
    {
      scores: SCORES(3),
      comment: "Falta profundizar",
      updatedAt: at("2026-11-13T18:00:00Z"),
      mentor: { name: "Dra. Pérez" },
    },
  ],
});
const gamma = team("t3", "Gamma sin nada", {
  createdAt: at("2026-11-12T15:20:00Z"),
});

const input = (over: Partial<ReportInput> = {}): ReportInput => ({
  event: {
    name: "Hackathon Monterrey 2026",
    code: "ABC123",
    mode: "CUSTOM",
    scenario: "Agentes de transformación del barrio Nuevo Horizonte",
    status: "FINISHED",
    startedAt: at("2026-11-12T16:00:00Z"),
    endsAt: at("2026-11-13T16:00:00Z"),
    maxTeamSize: 5,
  },
  hostName: "Organizadora QA",
  allTeams: [alfa, beta, gamma],
  onlyTeamId: null,
  generatedAt: at("2026-11-13T20:00:00Z"),
  timeZone: "America/Mexico_City",
  ...over,
});

describe("report model", () => {
  it("ranks by mentors' average, then phases, then points; ungraded last", () => {
    expect(rankTeams([gamma, beta, alfa]).map((r) => r.team.id)).toEqual([
      "t1",
      "t2",
      "t3",
    ]);
  });

  it("builds the whole-event report: info, stats, ranking and every team", () => {
    const r = buildReport(input());
    expect(r.title).toBe("Reporte de equipos");
    expect(r.fileName).toBe("tdoe-ABC123-reporte-equipos-2026-11-13.pdf");
    expect(r.stats).toEqual([
      { label: "Equipos", value: "3" },
      { label: "Participantes", value: "3" },
      { label: "Entregas", value: "1" },
      { label: "Calificaciones", value: "3" },
    ]);
    expect(r.ranking![0]).toEqual([
      "1",
      "Los Innovadores 🚀 Ñandú",
      "2",
      "3/12",
      "1/4",
      "60",
      "Sí",
      "2",
      "4.40",
    ]);
    expect(r.ranking![2]![8]).toBe("—");
    expect(r.teams.map((t) => t.name)).toEqual([
      "Los Innovadores 🚀 Ñandú",
      "Equipo Beta",
      "Gamma sin nada",
    ]);
    expect(r.scenario).toContain("Nuevo Horizonte");
    // Dates in the requested zone (CST = UTC-6).
    expect(r.eventInfo.find(([l]) => l === "Inicio")![1]).toMatch(
      /12 nov 2026.*10:00/,
    );
  });

  it("fills a team section: members, keys, answers, delivery and grades", () => {
    const t = buildReport(input()).teams[0]!;
    expect(t.position).toBe(1);
    expect(t.index).toBe(2); // second team created
    expect(t.members.map((m) => m.slice(0, 3))).toEqual([
      ["Ana", "Líder", RPG_PESQUISADOR],
      ["José", "Integrante", "—"],
    ]);
    expect(t.keys[0]).toMatchObject({
      label: "Problema",
      status: "Concluida",
      done: "3 de 3",
    });
    expect(t.keys[1]).toMatchObject({ label: "Solución", done: "0 de 3" });
    const problema = t.proposal[0]!;
    expect(problema.phases[0]).toMatchObject({
      title: "Fase 1 · Contexto",
      question: "¿Dónde ocurre el problema?",
      answer: "Respuesta de la fase 1 del problema",
    });
    expect(problema.phases[0]!.meta).toMatch(/^Completada por Ana · /);
    expect(t.proposal[1]!.phases[0]!.answer).toBeNull();
    expect(t.delivery.links.map((l) => l.label)).toEqual([
      "Link principal",
      "Link extra 1",
    ]);
    expect(t.delivery.files).toEqual([
      "Pitch final.pptx (3.2 MB)",
      "Resumen.pdf (410 KB)",
    ]);
    expect(t.evaluation.average).toBe("4.40");
    expect(t.evaluation.detail).toEqual([
      ["Dra. Pérez", "5", "5", "5", "5", "5", "5.00"],
      ["Ing. Gómez", "4", "4", "3", "4", "4", "3.80"],
    ]);
    expect(t.evaluation.comments).toEqual([
      {
        mentor: "Dra. Pérez",
        when: expect.any(String),
        text: "Excelente propuesta 👏",
      },
    ]);
  });

  it("one team: only that team, no ranking, named file", () => {
    const r = buildReport(input({ onlyTeamId: "t2" }));
    expect(r.title).toBe("Reporte del equipo");
    expect(r.ranking).toBeNull();
    expect(r.stats).toBeNull();
    expect(r.teams.map((t) => t.name)).toEqual(["Equipo Beta"]);
    expect(r.teams[0]!.position).toBe(2);
    expect(r.fileName).toBe("tdoe-ABC123-equipo-equipo-beta-2026-11-13.pdf");
  });

  it("unknown time zones fall back to Mexico City", () => {
    expect(resolveTimeZone("Not/AZone")).toBe("America/Mexico_City");
    expect(resolveTimeZone(null)).toBe("America/Mexico_City");
    expect(resolveTimeZone("America/Sao_Paulo")).toBe("America/Sao_Paulo");
  });

  it("slugs names for file names", () => {
    expect(slug("Los Innovadores 🚀 Ñandú!")).toBe("los-innovadores-nandu");
    expect(slug("🚀🚀")).toBe("equipo");
  });
});

describe("report PDF", () => {
  it("renders the whole event: valid PDF, cover + one page or more per team", async () => {
    const bytes = await renderReportPdf(buildReport(input()));
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(4);
    expect(doc.getTitle()).toBe(
      "Reporte de equipos — Hackathon Monterrey 2026",
    );
    if (process.env.REPORT_SAMPLE_OUT) {
      writeFileSync(`${process.env.REPORT_SAMPLE_OUT}/all.pdf`, bytes);
    }
  });

  it("renders one team, with emoji and long text that do not break it", async () => {
    const bytes = await renderReportPdf(
      buildReport(input({ onlyTeamId: "t1" })),
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
    if (process.env.REPORT_SAMPLE_OUT) {
      writeFileSync(`${process.env.REPORT_SAMPLE_OUT}/one.pdf`, bytes);
    }
  });

  it("renders an event without teams", async () => {
    const bytes = await renderReportPdf(buildReport(input({ allTeams: [] })));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});
