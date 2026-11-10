"use client";

import { useSearchParams } from "next/navigation";
import { SocializacaoPanel } from "@/features/event/SocializacaoPanel";

export default function SocializacaoPage() {
  const params = useSearchParams();
  const eventId = params.get("eventId") ?? "";
  return <SocializacaoPanel eventId={eventId} />;
}
