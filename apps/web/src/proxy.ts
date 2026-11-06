import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { getPlayerFromToken } from "@/lib/auth/player";
import {
  PLAYER_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
} from "@/lib/auth/session";
import { getStaffFromToken } from "@/lib/auth/staff";

const intlMiddleware = createMiddleware(routing);

// Any path Next resolves to src/app/[locale]/mestre (educator) or
// src/app/[locale]/jogador (player), including unsupported locales
// (/xx/mestre). Next renders layout and page in parallel, so a layout-level
// redirect does not stop the page content from shipping in the response: the
// guard has to live here (same as Maestro-virtual's /admin).
const STAFF_PATH = /^\/([^/]+)\/mestre(?:\/|$)/i;
const PLAYER_PATH = /^\/([^/]+)\/jogador(?:\/|$)/i;

function decodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function loginLocale(segment: string): string {
  const match = routing.locales.find(
    (locale) => locale.toLowerCase() === segment.toLowerCase(),
  );
  return match ?? routing.defaultLocale;
}

// The login screen (educator login and player event code) is the locale's
// home page.
function redirectToLogin(request: NextRequest, localeSegment: string) {
  const locale = loginLocale(localeSegment);
  return NextResponse.redirect(new URL(`/${locale}`, request.url));
}

// Next.js 16 renamed the middleware file convention to "proxy".
export default async function proxy(request: NextRequest) {
  const pathname = decodePathname(request.nextUrl.pathname);

  const staffMatch = pathname.match(STAFF_PATH);
  if (staffMatch) {
    const staff = await getStaffFromToken(
      request.cookies.get(STAFF_SESSION_COOKIE)?.value,
    );
    if (!staff) return redirectToLogin(request, staffMatch[1] ?? "");
  }

  const playerMatch = pathname.match(PLAYER_PATH);
  if (playerMatch) {
    const player = await getPlayerFromToken(
      request.cookies.get(PLAYER_SESSION_COOKIE)?.value,
    );
    if (!player) return redirectToLogin(request, playerMatch[1] ?? "");
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
