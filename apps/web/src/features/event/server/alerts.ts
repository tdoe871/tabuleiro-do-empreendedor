import type { Event } from "@tdoe/db";

import { MIN_TEAM_SIZE } from "./event";

// Mediation alerts for the educator panel. Computed on every overview from
// the teams' progress, nothing stored: an alert disappears by itself when
// its cause is gone. Pure functions so they can be unit-tested; the
// thresholds are defaults (changing a constant is enough).

// A team with no completed phase for this long gets TEAM_STUCK.
export const STUCK_AFTER_MINUTES = 60;
// Teams without a delivery get NO_SUBMISSION this close to the end, and it
// turns CRITICAL in the last stretch.
export const NO_SUBMISSION_WARNING_MINUTES = 120;
export const NO_SUBMISSION_CRITICAL_MINUTES = 30;

export type AlertType =
  "TEAM_STUCK" | "NO_SUBMISSION" | "TEAM_INCOMPLETE" | "CUSTOM";
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export type MediationAlert = {
  id: string;
  // The frontend translates by type; `minutes` fills the message.
  type: AlertType;
  severity: AlertSeverity;
  team: { id: string; name: string } | null;
  minutes: number | null;
  // Free text only for CUSTOM alerts; for the others, the type.
  message: string;
  createdAt: string;
};

export type AlertTeam = {
  id: string;
  name: string;
  createdAt: Date;
  memberCount: number;
  // When the team last completed a phase; null if never.
  lastCompletedAt: Date | null;
  allKeysDone: boolean;
  hasSubmission: boolean;
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
};
const minutesBetween = (from: Date, to: Date) =>
  Math.floor((to.getTime() - from.getTime()) / 60_000);

export function computeAlerts(
  event: Pick<Event, "status" | "startedAt" | "endsAt">,
  teams: AlertTeam[],
  now: Date,
): MediationAlert[] {
  if (event.status === "DRAFT" || event.status === "FINISHED") return [];

  const alerts: MediationAlert[] = [];
  const add = (
    type: AlertType,
    severity: AlertSeverity,
    team: AlertTeam,
    minutes: number | null,
  ) =>
    alerts.push({
      id: `${type}:${team.id}`,
      type,
      severity,
      team: { id: team.id, name: team.name },
      minutes,
      message: type,
      createdAt: now.toISOString(),
    });

  const minutesLeft =
    event.endsAt !== null ? minutesBetween(now, event.endsAt) : null;

  for (const team of teams) {
    if (team.memberCount < MIN_TEAM_SIZE) {
      add("TEAM_INCOMPLETE", "INFO", team, null);
    }

    if (event.status === "ACTIVE" && event.startedAt && !team.allKeysDone) {
      const since = [team.lastCompletedAt, event.startedAt, team.createdAt]
        .filter((d): d is Date => d !== null)
        .reduce((a, b) => (a > b ? a : b));
      const idle = minutesBetween(since, now);
      if (idle >= STUCK_AFTER_MINUTES) add("TEAM_STUCK", "WARNING", team, idle);
    }

    if (
      !team.hasSubmission &&
      minutesLeft !== null &&
      minutesLeft >= 0 &&
      minutesLeft <= NO_SUBMISSION_WARNING_MINUTES
    ) {
      add(
        "NO_SUBMISSION",
        minutesLeft <= NO_SUBMISSION_CRITICAL_MINUTES ? "CRITICAL" : "WARNING",
        team,
        minutesLeft,
      );
    }
  }

  return alerts.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      (a.team?.name ?? "").localeCompare(b.team?.name ?? ""),
  );
}
