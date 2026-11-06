"use client";

import { useSearchParams } from "next/navigation";
import { SocializacaoPanel } from "@/features/event/SocializacaoPanel";

export default function SocializacaoPage() {
  const params = useSearchParams();
  const numEquipes = Number(params.get("numEquipes") ?? "5") || 5;
  return <SocializacaoPanel numEquipes={numEquipes} />;
}
