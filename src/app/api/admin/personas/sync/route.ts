// src/app/api/admin/personas/sync/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { syncPersonasFromFilesystem } from "@/lib/db-sync";

export const runtime = "nodejs";

/**
 * POST /api/admin/personas/sync
 * Triggers a synchronization between the code repository (files) and the database.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const results = await syncPersonasFromFilesystem();
    return NextResponse.json({ 
      success: true, 
      migrated: results.migrated,
      failed: results.failed
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
