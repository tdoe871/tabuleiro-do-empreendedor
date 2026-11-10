"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TeamFlowHeader } from "@/components/shared/TeamFlowHeader";

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
        padding: 24,
      }}
    >
      <TeamFlowHeader />
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="card card-pad anim-in bg-white/5 backdrop-blur-md border border-white/10"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{t("chooseAction")}</h1>
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <Link
              href={`/team/create?${qs}`}
              className="btn btn-primary"
              style={{ flex: 1, minWidth: 160, justifyContent: "center" }}
            >
              {t("createTeam")}
            </Link>
            <Link
              href={`/team/join?${qs}`}
              className="btn btn-ghost"
              style={{ flex: 1, minWidth: 160, justifyContent: "center" }}
            >
              {t("joinTeam")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
