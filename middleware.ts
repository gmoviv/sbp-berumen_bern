import { auth } from "@/lib/auth.edge";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";

const publicRoutes = ["/login", "/login/2fa"];

// Extract the originating client IP from forwarded headers (C4).
// NextRequest.ip was removed in Next 15+; we now read x-forwarded-for /
// x-real-ip (Vercel populates these automatically). When neither is present
// we fall back to a per-route bucket so a misconfigured proxy can't merge
// every request into one global identifier.
function clientIp(req: NextRequest, path: string): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return `anon:${path}`;
}

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const session = await auth();
  const isLoggedIn = !!session;

  // 1. Rate Limiting for API routes — including auth (C2).
  if (nextUrl.pathname.startsWith("/api")) {
    const identifier = session?.user?.id || clientIp(req, nextUrl.pathname);
    const { success, limit, remaining, reset } = await checkRateLimit(
      identifier,
      nextUrl.pathname
    );

    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }
  }

  // 2. Authentication & Authorization Flow
  const isPublicRoute = publicRoutes.some((path) =>
    nextUrl.pathname.startsWith(path)
  );

  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (!isLoggedIn && !isPublicRoute && !nextUrl.pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
