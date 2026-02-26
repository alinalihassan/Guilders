import { type NextRequest, NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/sign-up", "/forgot-password", "/recovery", "/oauth/sign-in", "/oauth/consent"];
const OAUTH_PAGES = ["/oauth/sign-in", "/oauth/consent"];

const matchesRoute = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authPage = AUTH_PAGES.some((p) => matchesRoute(pathname, p));
  const oauthPage = OAUTH_PAGES.some((p) => matchesRoute(pathname, p));
  const callbackPage = matchesRoute(pathname, "/callback");
  const hasSessionCookie =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");

  if (!hasSessionCookie && !authPage && !callbackPage) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (hasSessionCookie && authPage && !oauthPage) return NextResponse.redirect(new URL("/", request.url));

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
