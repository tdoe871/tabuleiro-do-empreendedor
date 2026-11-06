// The 4 "chaves" (keys) of the board — Problema / Solução / Parcerias /
// Oportunidades — map to the BoardKey enum (uppercased) in
// packages/db/prisma/schema.prisma; each one has 3 phases (Phase.order 1-3).
export const KEY_IDS = [
  "problema",
  "solucao",
  "parcerias",
  "oportunidades",
] as const;
export type KeyId = (typeof KEY_IDS)[number];

export const KEY_COLOR_VAR: Record<KeyId, string> = {
  problema: "--prob",
  solucao: "--sol",
  parcerias: "--parc",
  oportunidades: "--opor",
};

export interface KeyTranslation {
  name: string;
  icon: string;
  desc: string;
}
