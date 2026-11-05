import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { STAFF_SESSION_COOKIE } from "@/lib/auth/session";
import { getStaffFromToken } from "@/lib/auth/staff";

const intlMiddleware = createMiddleware(routing);

// Any path Next resolves to src/app/[locale]/mestre, including unsupported
// locales (/xx/mestre). Next renders layout and page in parallel, so a
// layout-level redirect does not stop the page content from shipping in the
// response: the guard has to live here (same as Maestro-virtual's /admin).
const STAFF_PATH = /^\/([^/]+)\/mestre(?:\/|$)/i;

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

// Next.js 16 renamed the middleware file convention to "proxy".
export default async function proxy(request: NextRequest) {
  const staffMatch = decodePathname(request.nextUrl.pathname).match(STAFF_PATH);

  if (staffMatch) {
    const staff = await getStaffFromToken(
      request.cookies.get(STAFF_SESSION_COOKIE)?.value,
    );
    if (!staff) {
      // The login screen is the locale's home page.
      const locale = loginLocale(staffMatch[1] ?? "");
      const loginUrl = new URL(`/${locale}`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
