"use client";

import { useSearchParams } from "next/navigation";
import { PlayerBoard } from "@/features/event/PlayerBoard";

export default function JogadorDashboardPage() {
  const params = useSearchParams();
  return <PlayerBoard nickname={params.get("nickname") ?? ""} />;
}
