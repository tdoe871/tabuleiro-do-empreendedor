import { BoardKey } from "@prisma/client";

// Phases per chave on the board (PlayerBoard's TOTAL_FASES).
export const PHASES_PER_KEY = 3;

// The standard board every event gets: 4 chaves × 3 phases. Names and
// questions come from the i18n dictionaries (jogador.fases.<key>[order-1]).
// Used by the seed and, later, when an event is created.
export const BOARD_PHASES = Object.values(BoardKey).flatMap((key) =>
  Array.from({ length: PHASES_PER_KEY }, (_, i) => ({ key, order: i + 1 })),
);
