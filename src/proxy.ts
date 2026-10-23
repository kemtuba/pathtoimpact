// Next 16 convention: proxy.ts replaces middleware.ts. Having both is a build error.
// Optimistic redirect only: it checks that a session cookie exists. The real
// session check is auth.api.getSession() in each layout, page and handler.
// Routes that accept a request body stay outside this matcher, because the
// proxy truncates bodies above 10 MB instead of rejecting them.
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
