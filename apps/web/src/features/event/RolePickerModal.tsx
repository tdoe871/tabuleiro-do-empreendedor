"use client";

import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import {
  RPG_ROLE_IDS,
  RPG_ROLE_COLOR,
  RPG_ROLE_ICON,
  type RpgRoleId,
  type RpgRoleTranslation,
} from "./rpgRoles";

export function RolePickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (role: RpgRoleId) => void;
}) {
  const t = useTranslations("jogador.rpg");
  const tRoles = useTranslations("rpgPapeis");

  return (
    <Modal onClose={onClose} maxWidth={560}>
      <h3>{t("escolherTitulo")}</h3>
      <p>{t("escolherSub")}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {RPG_ROLE_IDS.map((id) => {
          const role = tRoles.raw(id) as RpgRoleTranslation;
          const color = RPG_ROLE_COLOR[id];
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                textAlign: "left",
                padding: 12,
                borderRadius: 11,
                border: `1.5px solid ${color}4D`,
                background: `${color}1A`,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: `${color}26`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  flexShrink: 0,
                }}
              >
                {RPG_ROLE_ICON[id]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color }}>
                  {role.nome}
                </div>
                <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>
                  {role.titulo}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--t2)",
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  {role.descricao}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--t3)",
                    marginTop: 6,
                    fontStyle: "italic",
                  }}
                >
                  {t("perspectiva")}: {role.perspectiva}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
