import { BOARD_KEYS, PHASES_PER_KEY, type BoardKey } from "@tdoe/db";

// How far a team is on the board, computed from the phases it has completed.
// Keys go in a fixed order (BOARD_KEYS): a key is "concluida" when its 3
// phases are done, the first unfinished key is "ativa" and the rest are
// "bloqueada". Values match the frontend's KeyStatus.

export type KeyStatus = "ativa" | "concluida" | "bloqueada";
export type KeyId = Lowercase<BoardKey>;

export function toKeyId(key: BoardKey): KeyId {
  return key.toLowerCase() as KeyId;
}

export function computeKeyStatuses(
  completedPhases: ReadonlyArray<{ key: BoardKey; order: number }>,
): Record<KeyId, KeyStatus> {
  const done = new Map<BoardKey, Set<number>>();
  for (const { key, order } of completedPhases) {
    if (!done.has(key)) done.set(key, new Set());
    done.get(key)?.add(order);
  }

  const statuses = {} as Record<KeyId, KeyStatus>;
  let activeAssigned = false;
  for (const key of BOARD_KEYS) {
    const completed = done.get(key)?.size ?? 0;
    if (completed >= PHASES_PER_KEY) {
      statuses[toKeyId(key)] = "concluida";
    } else if (!activeAssigned) {
      statuses[toKeyId(key)] = "ativa";
      activeAssigned = true;
    } else {
      statuses[toKeyId(key)] = "bloqueada";
    }
  }
  return statuses;
}
