"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  KEY_IDS,
  KEY_COLOR_VAR,
  type KeyTranslation,
} from "@/features/event/keys";

export function HeroConceitos() {
  const t = useTranslations("login");
  const tKeys = useTranslations("keys");
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="hero-conceitos">
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,.25)",
          marginBottom: 4,
        }}
      >
        {t("conceitosTitle")}
      </div>
      {KEY_IDS.map((id) => {
        const colorVar = `var(${KEY_COLOR_VAR[id]})`;
        const key = tKeys.raw(id) as KeyTranslation;
        const open = openId === id;
        return (
          <div
            key={id}
            className={`hc-card ${open ? "open" : ""}`}
            style={{
              background: `var(${KEY_COLOR_VAR[id]}-bg)`,
              borderColor: `var(${KEY_COLOR_VAR[id]}-bd)`,
            }}
          >
            <button
              type="button"
              className="hc-head"
              style={{
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => setOpenId(open ? null : id)}
            >
              <div
                className="hc-icn"
                style={{ background: `var(${KEY_COLOR_VAR[id]}-bg)` }}
              >
                {key.icon}
              </div>
              <div className="hc-nm" style={{ color: colorVar }}>
                {key.name}
              </div>
              <span className="hc-chev" style={{ color: colorVar }}>
                ›
              </span>
            </button>
            {open && (
              <div className="hc-body">
                {key.desc.split("\n\n").map((para, i) => (
                  <p key={i} style={{ marginBottom: i === 0 ? 10 : 0 }}>
                    {para}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
