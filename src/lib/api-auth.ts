import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "./auth";

/**
 * Server-side auth gate for API routes (C3). Use as the first line of every
 * AI-bearing route handler. Middleware alone is the wrong layer for streaming
 * responses; routes must reject anonymous calls themselves.
 *
 * Usage:
 *   const gate = await requireAuth();
 *   if (!gate.ok) return gate.response;
 *   const userId = gate.userId;
 */
export async function requireAuth(): Promise<
  | { ok: true; userId: string; session: Session }
  | { ok: false; response: NextResponse }
> {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, userId: session.user.id, session };
}
