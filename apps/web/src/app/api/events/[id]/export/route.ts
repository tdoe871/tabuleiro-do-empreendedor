import { NextResponse, type NextRequest } from "next/server";
import { BOARD_KEYS, PHASES_PER_KEY, prisma } from "@tdoe/db";

import {
  computeKeyStatuses,
  toKeyId,
  type KeyStatus,
} from "@/features/event/server/progress";
import { loadOwnedEvent } from "@/features/event/server/owned-event";
import { RUBRIC, summarizeEvaluations } from "@/features/mentor/server/rubric";
import { apiError } from "@/lib/api/errors";
import { toCsv } from "@/lib/csv";

// GET /api/events/:id/export?type=report|proposals — CSV for the educator
// (opens in Excel / Google Sheets), one row per team:
// - report: members, progress per key, delivery, files and mentors' grades.
// - proposals: the team's answer to each of the 12 phases plus its delivery.
// Headers are in Spanish (the organizers' language).

const KEY_LABEL: Record<(typeof BOARD_KEYS)[number], string> = {
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
const CRITERION_LABEL: Record<(typeof RUBRIC)[number], string> = {
  problema: "Problema",
  solucao: "Solución",
  impacto: "Impacto",
  viabilidade: "Viabilidad",
  apresentacao: "Presentación",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const type = request.nextUrl.searchParams.get("type") ?? "report";
  if (type !== "report" && type !== "proposals") {
    return apiError("VALIDATION_ERROR", { type: "INVALID" });
  }

  const loaded = await loadOwnedEvent(request, (await params).id);
  if ("error" in loaded) return loaded.error;
  const { event } = loaded;

  try {
    const teams = await prisma.team.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "asc" },
      select: {
        name: true,
        createdAt: true,
        participants: {
          orderBy: { joinedAt: "asc" },
          select: { nickname: true, role: true },
        },
        phaseProgress: {
          where: { completedAt: { not: null } },
          select: {
            content: true,
            completedAt: true,
            completedBy: { select: { nickname: true } },
            phase: { select: { key: true, order: true } },
          },
        },
        submission: true,
        files: {
          where: { status: "READY" },
          orderBy: { createdAt: "asc" },
          select: { fileName: true },
        },
        evaluations: { select: { scores: true } },
      },
    });

    const rows = type === "report" ? reportRows(teams) : proposalRows(teams);
    const date = new Date().toISOString().slice(0, 10);
    const name = type === "report" ? "reporte" : "propuestas";
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tdoe-${event.code}-${name}-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}

type ExportTeam = {
  name: string;
  createdAt: Date;
  participants: { nickname: string; role: string }[];
  phaseProgress: {
    content: string | null;
    completedAt: Date | null;
    completedBy: { nickname: string } | null;
    phase: { key: (typeof BOARD_KEYS)[number]; order: number };
  }[];
  submission: {
    type: string;
    url: string | null;
    links: string[];
    description: string | null;
    submittedAt: Date | null;
  } | null;
  files: { fileName: string }[];
  evaluations: { scores: unknown }[];
};

function reportRows(teams: ExportTeam[]): unknown[][] {
  const header = [
    "Equipo",
    "Creado",
    "Integrantes",
    "Líder",
    "Nicknames",
    ...BOARD_KEYS.map((key) => `Llave ${KEY_LABEL[key]}`),
    "Fases concluidas",
    "Última fase concluida",
    "Tipo de entrega",
    "Link principal",
    "Links extra",
    "Descripción de la entrega",
    "Entregado",
    "Archivos",
    "Calificaciones",
    "Promedio (1-5)",
    ...RUBRIC.map((id) => `Promedio ${CRITERION_LABEL[id]}`),
  ];

  const rows = teams.map((team) => {
    const keys = computeKeyStatuses(team.phaseProgress.map((p) => p.phase));
    const last = team.phaseProgress
      .map((p) => p.completedAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const summary = summarizeEvaluations(team.evaluations);
    const delivered = team.submission?.submittedAt ? team.submission : null;
    return [
      team.name,
      team.createdAt,
      team.participants.length,
      team.participants.find((p) => p.role === "LEADER")?.nickname ?? "",
      team.participants.map((p) => p.nickname).join("; "),
      ...BOARD_KEYS.map((key) => STATUS_LABEL[keys[toKeyId(key)]]),
      `${team.phaseProgress.length}/${BOARD_KEYS.length * PHASES_PER_KEY}`,
      last ?? "",
      delivered?.type ?? "",
      delivered?.url ?? "",
      delivered?.links.join("; ") ?? "",
      delivered?.description ?? "",
      delivered?.submittedAt ?? "",
      team.files.map((f) => f.fileName).join("; "),
      summary.count,
      summary.average ?? "",
      ...RUBRIC.map((id) => summary.byCriterion[id] ?? ""),
    ];
  });

  return [header, ...rows];
}

function proposalRows(teams: ExportTeam[]): unknown[][] {
  const phases = BOARD_KEYS.flatMap((key) =>
    Array.from({ length: PHASES_PER_KEY }, (_, i) => ({ key, order: i + 1 })),
  );
  const header = [
    "Equipo",
    ...phases.flatMap(({ key, order }) => [
      `${KEY_LABEL[key]} ${order}`,
      `${KEY_LABEL[key]} ${order} (quién y cuándo)`,
    ]),
    "Link principal",
    "Descripción de la entrega",
  ];

  const rows = teams.map((team) => {
    const byPhase = new Map(
      team.phaseProgress.map((p) => [`${p.phase.key}:${p.phase.order}`, p]),
    );
    const delivered = team.submission?.submittedAt ? team.submission : null;
    return [
      team.name,
      ...phases.flatMap(({ key, order }) => {
        const answer = byPhase.get(`${key}:${order}`);
        if (!answer) return ["", ""];
        const who = answer.completedBy?.nickname ?? "";
        const when = answer.completedAt?.toISOString() ?? "";
        return [answer.content ?? "", [who, when].filter(Boolean).join(" · ")];
      }),
      delivered?.url ?? "",
      delivered?.description ?? "",
    ];
  });

  return [header, ...rows];
}
