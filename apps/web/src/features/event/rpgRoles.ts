// Ported from tdoe/tdoe_app.py PAPEIS_RPG. Full scenario/NPC/mission system
// (CENARIOS_RPG) is intentionally out of scope — this keeps just the role
// picker + role tag on the member card.
export const RPG_ROLE_IDS = [
  "agente_saude",
  "lider_comunitario",
  "jovem_empreendedor",
  "pesquisador",
] as const;
export type RpgRoleId = (typeof RPG_ROLE_IDS)[number];

export const RPG_ROLE_COLOR: Record<RpgRoleId, string> = {
  agente_saude: "#38bdf8",
  lider_comunitario: "#00f5d4",
  jovem_empreendedor: "#2dd4bf",
  pesquisador: "#00bbf9",
};

export const RPG_ROLE_ICON: Record<RpgRoleId, string> = {
  agente_saude: "🩺",
  lider_comunitario: "🏘️",
  jovem_empreendedor: "🚀",
  pesquisador: "🔬",
};

export interface RpgRoleTranslation {
  nome: string;
  titulo: string;
  descricao: string;
  perspectiva: string;
}
