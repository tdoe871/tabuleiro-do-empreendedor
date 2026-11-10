import { BoardKey } from "@prisma/client";

// Phases per key on the board (PlayerBoard's TOTAL_FASES).
export const PHASES_PER_KEY = 3;

// The order a team goes through the keys. Moving to the next key is
// automatic once the 3 phases of the current one are done.
export const BOARD_KEYS: readonly BoardKey[] = [
  BoardKey.PROBLEMA,
  BoardKey.SOLUCAO,
  BoardKey.PARCERIAS,
  BoardKey.OPORTUNIDADES,
];

// The standard board every event gets: 4 keys × 3 phases. Names and
// questions come from the i18n dictionaries (jogador.fases.<key>[order-1]).
// Used by the seed and when an event is created.
export const BOARD_PHASES = BOARD_KEYS.flatMap((key) =>
  Array.from({ length: PHASES_PER_KEY }, (_, i) => ({ key, order: i + 1 })),
);
