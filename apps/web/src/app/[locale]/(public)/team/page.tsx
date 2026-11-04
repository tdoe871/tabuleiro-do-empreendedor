"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GemLogo } from "@/components/ui/GemLogo";

export default function ChooseTeamActionPage() {
  const t = useTranslations("team");
  const params = useSearchParams();
  const qs = params.toString();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 24,
      }}
    >
      <div className="logo-gem">
        <GemLogo />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t("chooseAction")}</h1>
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link href={`/team/create?${qs}`} className="btn btn-primary">
          {t("createTeam")}
        </Link>
        <Link href={`/team/join?${qs}`} className="btn btn-ghost">
          {t("joinTeam")}
        </Link>
      </div>
    </div>
  );
}
