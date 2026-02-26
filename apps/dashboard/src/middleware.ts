import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const cookie = request.headers.get("cookie") ?? "";
  const sessionResponse = await fetch(`${apiUrl}/api/auth/get-session`, {
    headers: { cookie },
    cache: "no-store",
  });
  const sessionPayload = sessionResponse.ok
    ? ((await sessionResponse.json()) as { user?: { id: string } | null })
    : null;
  const user = sessionPayload?.user ?? null;

  const authPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/sign-up") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/oauth/sign-in") ||
    request.nextUrl.pathname.startsWith("/oauth/consent");
  const oauthPage =
    request.nextUrl.pathname.startsWith("/oauth/sign-in") ||
    request.nextUrl.pathname.startsWith("/oauth/consent");

  const callbackPage = request.nextUrl.pathname.startsWith("/callback");

  // Not authenticated
  if (!user && !authPage && !callbackPage) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(url);
  }

  if (user && authPage && !oauthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

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
