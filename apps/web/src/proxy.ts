import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Same convention as Maestro-virtual: Next.js 16 renamed the middleware file
// convention to "proxy" (middleware.ts is deprecated).
//
// TODO: once staff login (src/lib/auth/session.ts) is wired up, guard
// /[locale]/mestre the same way Maestro-virtual guards /admin here — a
// layout-level redirect isn't enough because Next renders layout + page in
// parallel, so the protected page content can still ship in the response.
export default function proxy(request: NextRequest) {
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
