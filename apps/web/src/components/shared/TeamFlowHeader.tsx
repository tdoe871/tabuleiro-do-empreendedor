"use client";

import { useTranslations } from "next-intl";
import { GemLogo } from "@/components/ui/GemLogo";
import { LangSwitcher } from "./LangSwitcher";

// Shared header for the pre-login team flow (choose action / create / join)
// — these screens had no branding and no way to switch language, unlike
// every other screen in the app.
export function TeamFlowHeader() {
  const tCommon = useTranslations("common");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        maxWidth: 420,
        padding: "4px 2px 20px",
      }}
    >
      <div
        className="logo-gem backdrop-blur-md transition-all duration-300 hover:shadow-glow-amber"
        style={{ width: 30, height: 30 }}
      >
        <GemLogo size={18} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700 }}>
        {tCommon("appName")}
      </span>
      <div style={{ marginLeft: "auto" }}>
        <LangSwitcher />
      </div>
    </div>
  );
}
